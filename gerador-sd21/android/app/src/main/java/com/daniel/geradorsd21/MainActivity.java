package com.daniel.geradorsd21;

import android.app.Activity;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Tela nativa do gerador. O processamento pesado permanece no servidor Python,
 * onde o código original com PyTorch, Diffusers e o safety checker é executado.
 */
public final class MainActivity extends Activity {

    private static final String PREFS = "gerador_sd21_config";
    private static final String PREF_SERVER_URL = "server_url";
    private static final String EXPECTED_MODEL = "stabilityai/stable-diffusion-2-1-base";
    private static final int COLOR_IDLE = Color.rgb(174, 183, 208);
    private static final int COLOR_WORKING = Color.rgb(34, 211, 238);
    private static final int COLOR_SUCCESS = Color.rgb(34, 197, 94);
    private static final int COLOR_ERROR = Color.rgb(251, 113, 133);

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private EditText serverInput;
    private EditText promptInput;
    private EditText filenameInput;
    private Button testButton;
    private Button generateButton;
    private ProgressBar progressBar;
    private TextView statusChip;
    private TextView messageText;
    private TextView imagePlaceholder;
    private TextView saveLocationText;
    private ImageView resultImage;
    private volatile HttpURLConnection currentConnection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        serverInput = findViewById(R.id.serverInput);
        promptInput = findViewById(R.id.promptInput);
        filenameInput = findViewById(R.id.filenameInput);
        testButton = findViewById(R.id.testButton);
        generateButton = findViewById(R.id.generateButton);
        progressBar = findViewById(R.id.progressBar);
        statusChip = findViewById(R.id.statusChip);
        messageText = findViewById(R.id.messageText);
        imagePlaceholder = findViewById(R.id.imagePlaceholder);
        saveLocationText = findViewById(R.id.saveLocationText);
        resultImage = findViewById(R.id.resultImage);

        SharedPreferences preferences = getSharedPreferences(PREFS, MODE_PRIVATE);
        serverInput.setText(preferences.getString(PREF_SERVER_URL, ""));

        testButton.setOnClickListener(view -> testConnection());
        generateButton.setOnClickListener(view -> generateImage());
    }

    private void testConnection() {
        final String baseUrl;
        try {
            baseUrl = normalizedServerUrl();
        } catch (IllegalArgumentException error) {
            showError(error.getMessage());
            return;
        }

        persistServerUrl(baseUrl);
        setBusy(true, "Verificando modelo e filtro de segurança...");

        executor.execute(() -> {
            try {
                HealthInfo health = requireSafeServer(baseUrl);
                runOnUiThread(() -> {
                    setBusy(false, null);
                    statusChip.setText("Servidor pronto • " + health.device.toUpperCase(Locale.ROOT));
                    statusChip.setTextColor(COLOR_SUCCESS);
                    showMessage("Conexão aprovada. Stable Diffusion 2.1-base e filtro de segurança estão ativos.", COLOR_SUCCESS);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    setBusy(false, null);
                    showError(friendlyError(error));
                });
            }
        });
    }

    private void generateImage() {
        final String baseUrl;
        try {
            baseUrl = normalizedServerUrl();
        } catch (IllegalArgumentException error) {
            showError(error.getMessage());
            return;
        }

        final String prompt = promptInput.getText().toString().trim();
        if (prompt.isEmpty()) {
            promptInput.requestFocus();
            showError("O prompt não pode estar vazio.");
            return;
        }

        final String filename;
        try {
            filename = normalizePngName(filenameInput.getText().toString());
        } catch (IllegalArgumentException error) {
            filenameInput.requestFocus();
            showError(error.getMessage());
            return;
        }

        filenameInput.setText(filename);
        persistServerUrl(baseUrl);
        setBusy(true, "Gerando a imagem. Isso pode levar alguns minutos...");
        saveLocationText.setVisibility(View.GONE);

        executor.execute(() -> {
            try {
                // Falha segura também no cliente: só envia o prompt se o servidor
                // declarar o modelo exato e o safety checker operacional.
                requireSafeServer(baseUrl);
                byte[] pngBytes = requestGeneration(baseUrl, prompt, filename);

                Bitmap bitmap = BitmapFactory.decodeByteArray(pngBytes, 0, pngBytes.length);
                if (bitmap == null) {
                    throw new IOException("O servidor não devolveu uma imagem PNG válida.");
                }

                String savedAt = savePngToGallery(pngBytes, filename);
                runOnUiThread(() -> {
                    setBusy(false, null);
                    resultImage.setImageBitmap(bitmap);
                    resultImage.setVisibility(View.VISIBLE);
                    imagePlaceholder.setVisibility(View.GONE);
                    saveLocationText.setText("Salva em: " + savedAt);
                    saveLocationText.setVisibility(View.VISIBLE);
                    statusChip.setText("Imagem gerada e salva");
                    statusChip.setTextColor(COLOR_SUCCESS);
                    showMessage("✅ Imagem aprovada pelo filtro e salva em PNG.", COLOR_SUCCESS);
                    Toast.makeText(this, "Imagem salva na galeria", Toast.LENGTH_LONG).show();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    setBusy(false, null);
                    showError(friendlyError(error));
                });
            }
        });
    }

    private HealthInfo requireSafeServer(String baseUrl) throws IOException, JSONException {
        HttpURLConnection connection = openConnection(baseUrl + "/health", "GET", 30_000, 120_000);
        try {
            int code = connection.getResponseCode();
            byte[] body = readAll(code >= 200 && code < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream());

            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException(apiError(body, "Servidor indisponível (HTTP " + code + ")."));
            }

            JSONObject json = new JSONObject(new String(body, StandardCharsets.UTF_8));
            String model = json.optString("model_id", "");
            boolean checker = json.optBoolean("safety_checker", false);
            boolean ready = "ready".equalsIgnoreCase(json.optString("status", ""));

            if (!EXPECTED_MODEL.equals(model)) {
                throw new IOException("O servidor não está usando o modelo Stable Diffusion 2.1-base exigido.");
            }
            if (!checker) {
                throw new IOException("O filtro de segurança não está ativo. Geração cancelada.");
            }
            if (!ready) {
                throw new IOException("O modelo ainda não terminou de carregar.");
            }

            return new HealthInfo(json.optString("device", "desconhecido"));
        } finally {
            connection.disconnect();
            currentConnection = null;
        }
    }

    private byte[] requestGeneration(String baseUrl, String prompt, String filename)
            throws IOException, JSONException {
        HttpURLConnection connection = openConnection(baseUrl + "/generate", "POST", 30_000, 1_800_000);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("Accept", "image/png, application/json");
        connection.setDoOutput(true);

        JSONObject request = new JSONObject();
        request.put("prompt", prompt);
        request.put("filename", filename);
        byte[] requestBytes = request.toString().getBytes(StandardCharsets.UTF_8);

        try (OutputStream output = connection.getOutputStream()) {
            output.write(requestBytes);
        }

        try {
            int code = connection.getResponseCode();
            byte[] body = readAll(code >= 200 && code < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream());

            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException(apiError(body, "Falha na geração (HTTP " + code + ")."));
            }

            String contentType = connection.getContentType();
            if (contentType == null || !contentType.toLowerCase(Locale.ROOT).contains("image/png")) {
                throw new IOException("Resposta inválida: o servidor não devolveu um PNG.");
            }
            if (body.length < 100) {
                throw new IOException("A imagem recebida está vazia ou incompleta.");
            }
            return body;
        } finally {
            connection.disconnect();
            currentConnection = null;
        }
    }

    private HttpURLConnection openConnection(String address, String method, int connectTimeout, int readTimeout)
            throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        currentConnection = connection;
        connection.setRequestMethod(method);
        connection.setConnectTimeout(connectTimeout);
        connection.setReadTimeout(readTimeout);
        connection.setUseCaches(false);
        connection.setRequestProperty("User-Agent", "GeradorSD21-Android/1.0");
        return connection;
    }

    private String savePngToGallery(byte[] pngBytes, String filename) throws IOException {
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH,
                Environment.DIRECTORY_PICTURES + "/Gerador SD 2.1");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri item = getContentResolver().insert(collection, values);
        if (item == null) {
            throw new IOException("O Android não permitiu criar o arquivo na galeria.");
        }

        try {
            try (OutputStream output = getContentResolver().openOutputStream(item)) {
                if (output == null) {
                    throw new IOException("Não foi possível abrir o arquivo de saída.");
                }
                output.write(pngBytes);
            }
            ContentValues finished = new ContentValues();
            finished.put(MediaStore.Images.Media.IS_PENDING, 0);
            getContentResolver().update(item, finished, null, null);
        } catch (IOException error) {
            getContentResolver().delete(item, null, null);
            throw error;
        }

        return "Imagens/Gerador SD 2.1/" + filename;
    }

    private String normalizedServerUrl() {
        String value = serverInput.getText().toString().trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("Informe o endereço mostrado pelo servidor Python ou pelo Colab.");
        }
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = "https://" + value;
        }
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }

        try {
            URI uri = new URI(value);
            if (uri.getHost() == null || uri.getHost().trim().isEmpty()) {
                throw new IllegalArgumentException("Informe um endereço de servidor válido.");
            }
        } catch (URISyntaxException error) {
            throw new IllegalArgumentException("O endereço do servidor é inválido.");
        }
        serverInput.setText(value);
        return value;
    }

    private static String normalizePngName(String rawName) {
        String name = rawName == null ? "" : rawName.trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("O nome do arquivo não pode estar vazio.");
        }

        name = name.replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        name = name.replaceAll("[\\x00-\\x1F<>:\"/\\\\|?*]", "_").trim();
        if (name.isEmpty() || ".".equals(name) || "..".equals(name)) {
            throw new IllegalArgumentException("Informe um nome de arquivo válido.");
        }

        int dot = name.lastIndexOf('.');
        if (dot > 0) {
            name = name.substring(0, dot) + ".png";
        } else if (!name.toLowerCase(Locale.ROOT).endsWith(".png")) {
            name += ".png";
        }
        return name;
    }

    private static byte[] readAll(InputStream input) throws IOException {
        if (input == null) {
            return new byte[0];
        }
        try (InputStream source = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = source.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return output.toByteArray();
        }
    }

    private static String apiError(byte[] body, String fallback) {
        if (body == null || body.length == 0) {
            return fallback;
        }
        try {
            JSONObject json = new JSONObject(new String(body, StandardCharsets.UTF_8));
            String detail = json.optString("detail", "").trim();
            return detail.isEmpty() ? fallback : detail;
        } catch (JSONException ignored) {
            return fallback;
        }
    }

    private static String friendlyError(Exception error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return "Falha inesperada durante a operação.";
        }
        String lower = message.toLowerCase(Locale.ROOT);
        if (lower.contains("failed to connect") || lower.contains("connection refused")
                || lower.contains("unable to resolve host")) {
            return "Não foi possível conectar. Confirme se o servidor/Colab está ligado e se o endereço está correto.";
        }
        if (lower.contains("timeout") || lower.contains("timed out")) {
            return "A operação demorou além do limite. Verifique se o modelo ainda está carregando.";
        }
        return message;
    }

    private void persistServerUrl(String baseUrl) {
        getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(PREF_SERVER_URL, baseUrl)
                .apply();
    }

    private void setBusy(boolean busy, String message) {
        generateButton.setEnabled(!busy);
        testButton.setEnabled(!busy);
        progressBar.setVisibility(busy ? View.VISIBLE : View.GONE);
        if (busy) {
            statusChip.setText("Processando...");
            statusChip.setTextColor(COLOR_WORKING);
            showMessage(message, COLOR_WORKING);
        }
    }

    private void showMessage(String message, int color) {
        messageText.setText(message);
        messageText.setTextColor(color);
        messageText.setVisibility(View.VISIBLE);
    }

    private void showError(String message) {
        statusChip.setText("Ação necessária");
        statusChip.setTextColor(COLOR_ERROR);
        showMessage("❌ " + message, COLOR_ERROR);
    }

    @Override
    protected void onDestroy() {
        HttpURLConnection connection = currentConnection;
        if (connection != null) {
            connection.disconnect();
        }
        executor.shutdownNow();
        super.onDestroy();
    }

    private static final class HealthInfo {
        final String device;

        HealthInfo(String device) {
            this.device = device == null || device.trim().isEmpty() ? "desconhecido" : device;
        }
    }
}
