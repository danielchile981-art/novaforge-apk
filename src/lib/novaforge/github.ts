export type GithubStatus = {
  ok: boolean;
  code?: number;
  message: string;
};

export type GithubRun = {
  id: number;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: "success" | "failure" | "cancelled" | string | null;
  htmlUrl: string;
  headSha: string;
};

export type GithubArtifact = {
  id: number;
  name: string;
  archiveDownloadUrl: string;
  expired: boolean;
};

function explain(status: number, body: string): string {
  if (status === 401) return "Token inválido ou expirado. Gere outro token com acesso ao repositório.";
  if (status === 403) return "O GitHub recusou o acesso. Autorize conteúdo e Actions no token.";
  if (status === 404) return "O repositório ou arquivo não foi encontrado para esta conta.";
  if (status === 409) return "O repositório ainda está sendo preparado. Aguarde alguns segundos e tente novamente.";
  if (status === 422) return "O GitHub recusou os dados enviados. Confira o nome do projeto e as permissões do token.";
  return `GitHub respondeu ${status}. ${body.slice(0, 160)}`;
}

async function gh(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function safeRepoName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/(^[.-]+|[.-]+$)/g, "")
    .slice(0, 80) || "novaforge-app";
}

export async function githubWhoAmI(token: string): Promise<{ login?: string } & GithubStatus> {
  const r = await gh(token, "/user");
  if (r.status >= 400) return { ok: false, code: r.status, message: explain(r.status, r.text) };
  const login = (r.json as { login?: string } | null)?.login;
  if (!login) return { ok: false, message: "O GitHub não informou o usuário conectado." };
  return { ok: true, login, message: `Conectado como ${login}` };
}

export async function ensureRepo(
  token: string,
  owner: string,
  requestedName: string,
): Promise<GithubStatus & { name?: string; branch?: string }> {
  const name = safeRepoName(requestedName);
  let current = await gh(token, `/repos/${owner}/${name}`);
  if (current.status === 404) {
    const created = await gh(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name,
        private: true,
        auto_init: true,
        description: "Aplicativo criado no NovaForge Studio",
      }),
    });
    if (created.status >= 400) return { ok: false, code: created.status, message: explain(created.status, created.text) };
    current = created;
  } else if (current.status >= 400) {
    return { ok: false, code: current.status, message: explain(current.status, current.text) };
  }
  const branch = (current.json as { default_branch?: string } | null)?.default_branch || "main";
  return { ok: true, name, branch, message: "Repositório pronto." };
}

/** Publishes every generated file in one commit, so one APK build starts. */
export async function publishProject(
  token: string,
  owner: string,
  requestedRepo: string,
  files: Record<string, string>,
  onProgress?: (done: number, total: number, message: string) => void,
): Promise<GithubStatus & { repo?: string; branch?: string; commitSha?: string }> {
  const ensured = await ensureRepo(token, owner, requestedRepo);
  if (!ensured.ok || !ensured.name || !ensured.branch) return ensured;
  const repo = ensured.name;
  const branch = ensured.branch;

  let ref = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  if (ref.status === 409 || ref.status === 404) {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    ref = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  }
  if (ref.status >= 400) return { ok: false, code: ref.status, message: explain(ref.status, ref.text) };
  const parentSha = (ref.json as { object?: { sha?: string } } | null)?.object?.sha;
  if (!parentSha) return { ok: false, message: "Não foi possível localizar a versão atual do repositório." };

  const commit = await gh(token, `/repos/${owner}/${repo}/git/commits/${parentSha}`);
  if (commit.status >= 400) return { ok: false, code: commit.status, message: explain(commit.status, commit.text) };
  const baseTree = (commit.json as { tree?: { sha?: string } } | null)?.tree?.sha;

  const entries = Object.entries(files)
    .map(([path, content]) => [path.replace(/^\/+/, "").replace(/\.\.(?:\/|\\)/g, ""), content] as const)
    .filter(([path]) => Boolean(path));
  const tree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];
  let done = 0;
  for (const [path, content] of entries) {
    const blob = await gh(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: utf8ToBase64(content), encoding: "base64" }),
    });
    if (blob.status >= 400) return { ok: false, code: blob.status, message: `${path}: ${explain(blob.status, blob.text)}` };
    const sha = (blob.json as { sha?: string } | null)?.sha;
    if (!sha) return { ok: false, message: `O GitHub não confirmou o arquivo ${path}.` };
    tree.push({ path, mode: "100644", type: "blob", sha });
    done += 1;
    onProgress?.(done, entries.length, `Preparando ${done} de ${entries.length}`);
  }

  const nextTree = await gh(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  if (nextTree.status >= 400) return { ok: false, code: nextTree.status, message: explain(nextTree.status, nextTree.text) };
  const treeSha = (nextTree.json as { sha?: string } | null)?.sha;
  if (!treeSha) return { ok: false, message: "O GitHub não confirmou a árvore do projeto." };

  const nextCommit = await gh(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: "NovaForge Studio: publicar aplicativo", tree: treeSha, parents: [parentSha] }),
  });
  if (nextCommit.status >= 400) return { ok: false, code: nextCommit.status, message: explain(nextCommit.status, nextCommit.text) };
  const commitSha = (nextCommit.json as { sha?: string } | null)?.sha;
  if (!commitSha) return { ok: false, message: "O GitHub não confirmou a nova versão." };

  const updated = await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
  if (updated.status >= 400) return { ok: false, code: updated.status, message: explain(updated.status, updated.text) };
  return { ok: true, repo, branch, commitSha, message: "Projeto publicado. A compilação do APK foi iniciada." };
}

export async function findWorkflowRun(
  token: string,
  owner: string,
  repo: string,
  commitSha?: string,
): Promise<GithubStatus & { run?: GithubRun }> {
  const r = await gh(token, `/repos/${owner}/${repo}/actions/runs?per_page=20`);
  if (r.status >= 400) return { ok: false, code: r.status, message: explain(r.status, r.text) };
  const runs = (r.json as {
    workflow_runs?: Array<{ id: number; status: string; conclusion: string | null; html_url: string; head_sha: string }>;
  } | null)?.workflow_runs || [];
  const found = commitSha ? runs.find((run) => run.head_sha === commitSha) : runs[0];
  if (!found) return { ok: false, message: "A compilação ainda não apareceu. Aguarde alguns segundos." };
  return {
    ok: true,
    run: { id: found.id, status: found.status, conclusion: found.conclusion, htmlUrl: found.html_url, headSha: found.head_sha },
    message: found.status === "completed" ? "Compilação concluída." : "Compilação em andamento.",
  };
}

export async function latestArtifact(
  token: string,
  owner: string,
  repo: string,
  runId?: number,
): Promise<GithubStatus & { artifact?: GithubArtifact }> {
  const path = runId
    ? `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts?per_page=10`
    : `/repos/${owner}/${repo}/actions/artifacts?per_page=10`;
  const r = await gh(token, path);
  if (r.status >= 400) return { ok: false, code: r.status, message: explain(r.status, r.text) };
  const artifacts = (r.json as {
    artifacts?: Array<{ id: number; name: string; archive_download_url: string; expired: boolean }>;
  } | null)?.artifacts || [];
  const found = artifacts.find((item) => !item.expired);
  if (!found) return { ok: false, message: "O APK ainda não foi publicado pela compilação." };
  return {
    ok: true,
    artifact: { id: found.id, name: found.name, archiveDownloadUrl: found.archive_download_url, expired: found.expired },
    message: `APK disponível: ${found.name}`,
  };
}

export async function downloadArtifact(token: string, artifact: GithubArtifact, filename: string): Promise<GithubStatus> {
  const res = await fetch(artifact.archiveDownloadUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return { ok: false, code: res.status, message: explain(res.status, await res.text()) };
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".zip") ? filename : `${filename}.zip`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok: true, message: "Download do APK iniciado." };
}

export async function putFiles(
  token: string,
  owner: string,
  repo: string,
  files: Record<string, string>,
  onProgress?: (done: number, total: number) => void,
): Promise<GithubStatus> {
  return publishProject(token, owner, repo, files, (done, total) => onProgress?.(done, total));
}

export async function dispatchWorkflow(token: string, owner: string, repo: string): Promise<GithubStatus> {
  const r = await gh(token, `/repos/${owner}/${repo}/actions/workflows/android-apk.yml/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: "main" }),
  });
  if (r.status === 204 || r.status === 200) return { ok: true, message: "Compilação solicitada." };
  return { ok: false, code: r.status, message: explain(r.status, r.text) };
}
