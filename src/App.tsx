import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  Download,
  Eye,
  FileArchive,
  FolderKanban,
  Github,
  Hammer,
  HardDriveDownload,
  History,
  Home,
  Laptop,
  LoaderCircle,
  Moon,
  MoreVertical,
  PackageCheck,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  WandSparkles,
  WifiOff,
  X,
} from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import coverImage from "./assets/novaforge-cover.webp";
import {
  createFromIdea,
  createFromTemplate,
  duplicateProject,
  getProject,
  listHistory,
  listProjects,
  listVersions,
  modifyProject,
  removeProject,
  restoreVersion,
  restoreWorking,
  saveCodeEdit,
} from "./lib/novaforge/engine";
import {
  downloadArtifact,
  findWorkflowRun,
  githubWhoAmI,
  latestArtifact,
  publishProject,
  type GithubArtifact,
  type GithubRun,
} from "./lib/novaforge/github";
import { compilePreviewHtml } from "./lib/novaforge/preview";
import { CATEGORIES, interpretPrompt, specSummary } from "./lib/novaforge/spec";
import {
  exportRawDump,
  getSettings,
  importRawDump,
  renameProject,
  saveSettings,
} from "./lib/novaforge/storage";
import type {
  Category,
  HistoryEntry,
  ProjectMeta,
  ProjectRecord,
  Settings as AppSettings,
  VersionSnap,
} from "./lib/novaforge/types";
import { downloadBlob, zipProject } from "./lib/novaforge/zip";

type View = "home" | "create" | "projects" | "history" | "settings" | "project";
type ProjectTab = "preview" | "code" | "export" | "versions";
type ToastTone = "ok" | "error" | "info";

type ToastState = { id: number; message: string; tone: ToastTone } | null;
type BuildState = {
  phase: "idle" | "publishing" | "waiting" | "success" | "error";
  message: string;
  repo?: string;
  commitSha?: string;
  run?: GithubRun;
  artifact?: GithubArtifact;
};

const BUILD_KEY = "novaforge.build.";

const EXAMPLES = [
  "Crie um aplicativo para registrar vendas, cadastrar produtos, controlar estoque e mostrar o lucro mensal",
  "Finanças pessoais com receitas, despesas, saldo e relatório por mês",
  "Lista de tarefas com prazo, prioridade, busca e conclusão",
  "Hábitos diários para marcar o dia e acompanhar a sequência",
  "Agenda de compromissos da semana com contatos e observações",
  "Cadastro de clientes com telefone, cidade, busca e anotações",
];

const CATEGORY_ICONS: Partial<Record<Category, typeof Boxes>> = {
  "vendas-estoque": Boxes,
  vendas: PackageCheck,
  estoque: Boxes,
  financas: HardDriveDownload,
  tarefas: CheckCircle2,
  habitos: RefreshCw,
  agenda: Clock3,
  clientes: FolderKanban,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function saveText(text: string, filename: string, type = "application/json"): void {
  downloadBlob(new Blob([text], { type }), filename);
}

function readBuild(projectId: string): BuildState {
  try {
    const raw = localStorage.getItem(BUILD_KEY + projectId);
    return raw ? (JSON.parse(raw) as BuildState) : { phase: "idle", message: "" };
  } catch {
    return { phase: "idle", message: "" };
  }
}

function writeBuild(projectId: string, state: BuildState): void {
  try {
    localStorage.setItem(BUILD_KEY + projectId, JSON.stringify(state));
  } catch {
    // A build can continue even if the browser refuses optional status persistence.
  }
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>(() => listProjects());
  const [history, setHistory] = useState<HistoryEntry[]>(() => listHistory());
  const [settings, setSettingsState] = useState<AppSettings>(() => getSettings());
  const [toast, setToast] = useState<ToastState>(null);
  const [showSplash, setShowSplash] = useState(true);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.colorScheme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    let dispose = () => undefined;
    void CapacitorApp.addListener("backButton", () => {
      if (view === "project") {
        refresh();
        navigate("projects");
      } else if (view !== "home") {
        navigate("home");
      } else {
        void CapacitorApp.exitApp();
      }
    }).then((handle) => {
      if (!active) {
        void handle.remove();
        return;
      }
      dispose = () => void handle.remove();
    });
    return () => {
      active = false;
      dispose();
    };
  }, [view]);

  function refresh() {
    setProjects(listProjects());
    setHistory(listHistory());
  }

  function notify(message: string, tone: ToastTone = "info") {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }

  function navigate(next: View, selectedId?: string) {
    if (selectedId) setProjectId(selectedId);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSettings(next: AppSettings) {
    saveSettings(next);
    setSettingsState(next);
  }

  const page = (() => {
    if (view === "create") {
      return (
        <CreatePage
          onCreated={(id) => {
            refresh();
            navigate("project", id);
          }}
          notify={notify}
        />
      );
    }
    if (view === "projects") {
      return (
        <ProjectsPage
          projects={projects}
          open={(id) => navigate("project", id)}
          create={() => navigate("create")}
          refresh={refresh}
          notify={notify}
        />
      );
    }
    if (view === "history") return <HistoryPage entries={history} open={(id) => navigate("project", id)} />;
    if (view === "settings") {
      return (
        <SettingsPage
          settings={settings}
          projectsCount={projects.length}
          update={updateSettings}
          refresh={refresh}
          notify={notify}
        />
      );
    }
    if (view === "project" && projectId) {
      return (
        <ProjectPage
          id={projectId}
          settings={settings}
          updateSettings={updateSettings}
          back={() => {
            refresh();
            navigate("projects");
          }}
          refreshAll={refresh}
          notify={notify}
        />
      );
    }
    return <HomePage projects={projects} create={() => navigate("create")} open={(id) => navigate("project", id)} />;
  })();

  const isWorkspace = view === "project";

  return (
    <div className="app-frame">
      {showSplash ? <Splash /> : null}
      {!isWorkspace ? <TopBar openSettings={() => navigate("settings")} /> : null}
      <div className={isWorkspace ? "workspace-wrap" : "page-wrap"}>{page}</div>
      {!isWorkspace ? <BottomNav active={view} navigate={navigate} /> : null}
      {toast ? <Toast toast={toast} close={() => setToast(null)} /> : null}
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand-mark compact" : "brand-mark"} aria-hidden="true">
      <Hammer size={compact ? 17 : 25} strokeWidth={2.1} />
      <span className="brand-spark" />
    </span>
  );
}

function Splash() {
  return (
    <div className="splash" aria-label="Abrindo NovaForge Studio">
      <img src={coverImage} alt="" className="splash-art" />
      <div className="splash-copy">
        <p className="eyebrow">IDEIAS EM MOVIMENTO</p>
        <h1>NovaForge <span>Studio</span></h1>
        <p>Forjando seu próximo aplicativo</p>
      </div>
      <div className="splash-loader"><span /></div>
    </div>
  );
}

function TopBar({ openSettings }: { openSettings: () => void }) {
  return (
    <header className="topbar">
      <button className="brand-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <BrandMark compact />
        <span>NovaForge <strong>Studio</strong></span>
      </button>
      <button className="icon-button" aria-label="Abrir configurações" onClick={openSettings}>
        <Settings size={20} />
      </button>
    </header>
  );
}

function BottomNav({ active, navigate }: { active: View; navigate: (view: View) => void }) {
  const items: Array<{ id: View; label: string; icon: typeof Home }> = [
    { id: "home", label: "Início", icon: Home },
    { id: "create", label: "Criar", icon: WandSparkles },
    { id: "projects", label: "Projetos", icon: FolderKanban },
    { id: "history", label: "Histórico", icon: Clock3 },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
            <Icon size={20} strokeWidth={1.9} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function HomePage({ projects, create, open }: { projects: ProjectMeta[]; create: () => void; open: (id: string) => void }) {
  const recent = projects.slice(0, 3);
  return (
    <main className="home-page page-content">
      <section className="hero-card">
        <img src={coverImage} alt="" className="hero-art" />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="status-pill"><span /> Motor local pronto</span>
          <h1>Sua ideia vira um<br /><em>app de verdade.</em></h1>
          <p>Descreva o que precisa. O NovaForge cria telas, funções, dados e prepara o APK.</p>
          <button className="primary-button large" onClick={create}>
            Criar aplicativo <ArrowRight size={19} />
          </button>
        </div>
      </section>

      <section className="quick-grid" aria-label="Recursos principais">
        <article><WifiOff size={19} /><strong>Sem limites</strong><span>Motor local e offline</span></article>
        <article><PackageCheck size={19} /><strong>APK Android</strong><span>Projeto pronto para compilar</span></article>
        <article><ShieldCheck size={19} /><strong>Backup seguro</strong><span>Restaure projetos e versões</span></article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">SEUS TRABALHOS</p><h2>Projetos recentes</h2></div>
          <span className="count-badge">{projects.length}</span>
        </div>
        {recent.length ? (
          <div className="project-list">
            {recent.map((project) => <ProjectRow key={project.id} project={project} open={() => open(project.id)} />)}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="Sua forja está pronta" text="Crie seu primeiro aplicativo usando uma descrição simples." action="Começar agora" onAction={create} />
        )}
      </section>
    </main>
  );
}

function CreatePage({ onCreated, notify }: { onCreated: (id: string) => void; notify: (message: string, tone?: ToastTone) => void }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const summary = useMemo(() => (prompt.trim().length >= 8 ? specSummary(interpretPrompt(prompt)) : ""), [prompt]);

  async function create() {
    const text = prompt.trim();
    if (text.length < 8) {
      notify("Descreva um pouco mais o aplicativo que você quer.", "error");
      return;
    }
    setBusy(true);
    const stages = [
      [12, "Entendendo sua ideia"],
      [28, "Planejando as telas"],
      [47, "Montando os dados"],
      [68, "Criando as funções"],
      [86, "Testando o código"],
      [100, "Aplicativo pronto"],
    ] as const;
    try {
      for (const [value, label] of stages) {
        setProgress(value);
        setStage(label);
        await wait(value === 100 ? 180 : 260);
      }
      const result = createFromIdea(text);
      notify("Aplicativo criado e salvo no aparelho.", "ok");
      onCreated(result.project.meta.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar o aplicativo.", "error");
    } finally {
      setBusy(false);
    }
  }

  function useTemplate(category: Category, name: string) {
    try {
      const project = createFromTemplate(category, name);
      notify("Modelo criado. Agora você pode personalizar.", "ok");
      onCreated(project.meta.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível abrir o modelo.", "error");
    }
  }

  return (
    <main className="page-content create-page">
      <div className="title-block">
        <p className="eyebrow">MOTOR INTELIGENTE LOCAL</p>
        <h1>O que vamos criar?</h1>
        <p>Explique com suas palavras. Você poderá testar e mudar tudo depois.</p>
      </div>
      <section className="prompt-card">
        <label htmlFor="idea">Descrição do aplicativo</label>
        <textarea
          id="idea"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ex.: Quero um app para cadastrar produtos, registrar vendas, baixar o estoque e mostrar meu lucro por mês..."
          maxLength={4000}
        />
        <div className="prompt-meta"><span>{prompt.length}/4000</span><span><WifiOff size={14} /> Funciona offline</span></div>
        {summary ? <pre className="idea-summary">{summary}</pre> : null}
        <button className="primary-button large full" disabled={busy} onClick={() => void create()}>
          {busy ? <LoaderCircle className="spin" size={19} /> : <Sparkles size={19} />}
          {busy ? stage : "Forjar aplicativo"}
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">ATALHOS</p><h2>Ideias prontas</h2></div></div>
        <div className="suggestion-list">
          {EXAMPLES.map((item) => (
            <button key={item} onClick={() => setPrompt(item)}><span>{item}</span><ArrowRight size={16} /></button>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">MODELOS FUNCIONAIS</p><h2>Comece por uma categoria</h2></div></div>
        <div className="template-grid">
          {CATEGORIES.slice(0, 12).map((category) => {
            const Icon = CATEGORY_ICONS[category.id] || Laptop;
            return (
              <button key={category.id} onClick={() => useTemplate(category.id, category.label)}>
                <span className="template-icon"><Icon size={20} /></span>
                <strong>{category.label}</strong>
                <small>{category.blurb}</small>
              </button>
            );
          })}
        </div>
      </section>

      {busy ? (
        <div className="progress-modal" role="status" aria-live="polite">
          <div className="forge-loader"><Hammer size={28} /><span /></div>
          <p className="eyebrow">FORJANDO</p>
          <h2>{stage}</h2>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{progress}% concluído</p>
        </div>
      ) : null}
    </main>
  );
}

function ProjectsPage({
  projects,
  open,
  create,
  refresh,
  notify,
}: {
  projects: ProjectMeta[];
  open: (id: string) => void;
  create: () => void;
  refresh: () => void;
  notify: (message: string, tone?: ToastTone) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = projects.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="page-content">
      <div className="title-row">
        <div className="title-block compact"><p className="eyebrow">BIBLIOTECA</p><h1>Meus projetos</h1><p>{projects.length} aplicativo{projects.length === 1 ? "" : "s"} salvo{projects.length === 1 ? "" : "s"}</p></div>
        <button className="square-primary" aria-label="Criar projeto" onClick={create}><Plus size={22} /></button>
      </div>
      {projects.length ? (
        <>
          <label className="search-box"><span className="sr-only">Buscar projetos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projeto" /></label>
          <div className="project-list roomy">
            {filtered.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                open={() => open(project.id)}
                actions={
                  <MenuActions
                    duplicate={() => {
                      duplicateProject(project.id);
                      refresh();
                      notify("Cópia criada.", "ok");
                    }}
                    remove={() => {
                      if (!window.confirm(`Excluir “${project.name}”? O backup geral não será apagado.`)) return;
                      removeProject(project.id);
                      refresh();
                      notify("Projeto excluído.", "info");
                    }}
                  />
                }
              />
            ))}
          </div>
          {!filtered.length ? <EmptyState icon={FolderKanban} title="Nenhum resultado" text="Tente buscar por outro nome." /> : null}
        </>
      ) : (
        <EmptyState icon={FolderKanban} title="Nenhum projeto salvo" text="Crie um aplicativo funcional em poucos passos." action="Criar aplicativo" onAction={create} />
      )}
    </main>
  );
}

function MenuActions({ duplicate, remove }: { duplicate: () => void; remove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu-wrap">
      <button className="icon-button subtle" aria-label="Opções do projeto" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}><MoreVertical size={19} /></button>
      {open ? (
        <div className="menu-popover">
          <button onClick={(event) => { event.stopPropagation(); setOpen(false); duplicate(); }}><Copy size={16} /> Duplicar</button>
          <button className="danger" onClick={(event) => { event.stopPropagation(); setOpen(false); remove(); }}><Trash2 size={16} /> Excluir</button>
        </div>
      ) : null}
    </div>
  );
}

function ProjectRow({ project, open, actions }: { project: ProjectMeta; open: () => void; actions?: ReactNode }) {
  return (
    <article className="project-row" onClick={open}>
      <img src={project.thumbnail} alt="" />
      <div><strong>{project.name}</strong><p>{project.description}</p><span>{formatDate(project.updatedAt)} · {project.category.replace("-", " + ")}</span></div>
      {actions || <ArrowRight size={18} className="row-arrow" />}
    </article>
  );
}

function HistoryPage({ entries, open }: { entries: HistoryEntry[]; open: (id: string) => void }) {
  return (
    <main className="page-content">
      <div className="title-block compact"><p className="eyebrow">LINHA DO TEMPO</p><h1>Histórico</h1><p>Criações, alterações, backups e compilações.</p></div>
      {entries.length ? (
        <div className="timeline">
          {entries.map((entry) => (
            <button key={entry.id} onClick={() => entry.projectId && open(entry.projectId)} disabled={!entry.projectId}>
              <span className={`timeline-icon tone-${entry.kind}`}><History size={17} /></span>
              <span><strong>{entry.title}</strong>{entry.detail ? <small>{entry.detail}</small> : null}<time>{formatTime(entry.at)}</time></span>
            </button>
          ))}
        </div>
      ) : <EmptyState icon={Clock3} title="O histórico começa aqui" text="As ações importantes aparecerão nesta tela." />}
    </main>
  );
}

function SettingsPage({
  settings,
  projectsCount,
  update,
  refresh,
  notify,
}: {
  settings: AppSettings;
  projectsCount: number;
  update: (settings: AppSettings) => void;
  refresh: () => void;
  notify: (message: string, tone?: ToastTone) => void;
}) {
  const [token, setToken] = useState(settings.githubToken || "");
  const [checking, setChecking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function verifyGithub() {
    if (!token.trim()) {
      notify("Cole primeiro o token do GitHub.", "error");
      return;
    }
    setChecking(true);
    try {
      const result = await githubWhoAmI(token.trim());
      if (!result.ok || !result.login) {
        notify(result.message, "error");
        return;
      }
      update({ ...settings, githubToken: token.trim(), githubUser: result.login });
      notify(`GitHub conectado como ${result.login}.`, "ok");
    } finally {
      setChecking(false);
    }
  }

  function exportBackup() {
    saveText(exportRawDump(), `NovaForge-Backup-${new Date().toISOString().slice(0, 10)}.json`);
    notify("Backup baixado. Guarde esse arquivo em local seguro.", "ok");
  }

  async function importBackup(file: File) {
    try {
      const result = importRawDump(await file.text());
      refresh();
      notify(`Backup restaurado: ${result.projects} projeto(s).`, "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível restaurar o backup.", "error");
    }
  }

  return (
    <main className="page-content settings-page">
      <div className="title-block compact"><p className="eyebrow">PREFERÊNCIAS</p><h1>Configurações</h1><p>Personalize, conecte e proteja seus projetos.</p></div>

      <section className="settings-section">
        <div className="setting-title"><Palette size={19} /><div><strong>Aparência</strong><span>Tema usado em todo o NovaForge</span></div></div>
        <div className="segmented">
          <button className={settings.theme === "dark" ? "active" : ""} onClick={() => update({ ...settings, theme: "dark" })}><Moon size={17} /> Escuro</button>
          <button className={settings.theme === "light" ? "active" : ""} onClick={() => update({ ...settings, theme: "light" })}><Sun size={17} /> Claro</button>
        </div>
      </section>

      <section className="settings-section">
        <div className="setting-title"><Github size={19} /><div><strong>GitHub e APK</strong><span>Compilação gratuita pelo GitHub Actions</span></div></div>
        {settings.githubUser ? <p className="connection-ok"><CheckCircle2 size={16} /> Conectado como {settings.githubUser}</p> : null}
        <label className="field-label">Token de acesso</label>
        <input className="text-input" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_... ou ghp_..." autoComplete="off" />
        <p className="field-help">O token fica somente neste aparelho e não entra no backup.</p>
        <button className="secondary-button full" disabled={checking} onClick={() => void verifyGithub()}>
          {checking ? <LoaderCircle className="spin" size={17} /> : <Github size={17} />} Testar conexão
        </button>
      </section>

      <section className="settings-section">
        <div className="setting-title"><ShieldCheck size={19} /><div><strong>Backup completo</strong><span>{projectsCount} projeto{projectsCount === 1 ? "" : "s"} protegido{projectsCount === 1 ? "" : "s"}</span></div></div>
        <div className="button-pair">
          <button className="secondary-button" onClick={exportBackup}><Download size={17} /> Baixar backup</button>
          <button className="secondary-button" onClick={() => fileInput.current?.click()}><Upload size={17} /> Restaurar</button>
        </div>
        <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.currentTarget.value = ""; }} />
      </section>

      <section className="about-card">
        <BrandMark />
        <div><strong>NovaForge Studio</strong><span>Versão 2.0 · Edição Unificada</span></div>
        <p>Motor local sem cobrança por criação. Projetos salvos no aparelho, versões restauráveis e exportação completa.</p>
      </section>
    </main>
  );
}

function ProjectPage({
  id,
  settings,
  updateSettings,
  back,
  refreshAll,
  notify,
}: {
  id: string;
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => void;
  back: () => void;
  refreshAll: () => void;
  notify: (message: string, tone?: ToastTone) => void;
}) {
  const [tick, setTick] = useState(0);
  const project = useMemo(() => getProject(id), [id, tick]);
  const [tab, setTab] = useState<ProjectTab>("preview");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [build, setBuild] = useState<BuildState>(() => readBuild(id));
  const monitorRef = useRef(0);

  useEffect(() => {
    if (!project) return;
    setNameDraft(project.meta.name);
    const first = Object.keys(project.files).sort()[0] || "";
    setSelectedFile((current) => current || first);
  }, [project?.meta.id]);

  useEffect(() => {
    writeBuild(id, build);
  }, [build, id]);

  if (!project) {
    return <main className="missing-project"><AlertTriangle size={30} /><h1>Projeto não encontrado</h1><button className="primary-button" onClick={back}>Voltar</button></main>;
  }

  const activeProject: ProjectRecord = project;
  const files = activeProject.files;
  const names = Object.keys(files).sort();
  const currentFile = names.includes(selectedFile) ? selectedFile : names[0] || "";
  const versions = listVersions(id);

  function reload() {
    setTick((value) => value + 1);
    refreshAll();
  }

  async function applyChange() {
    if (instruction.trim().length < 3) {
      notify("Escreva a alteração que deseja.", "error");
      return;
    }
    setBusy(true);
    try {
      await wait(420);
      modifyProject(id, instruction.trim());
      setInstruction("");
      reload();
      notify("Alteração aplicada e nova versão salva.", "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "A alteração não pôde ser aplicada.", "error");
    } finally {
      setBusy(false);
    }
  }

  function saveName() {
    const next = nameDraft.trim();
    if (!next || next === activeProject.meta.name) return;
    renameProject(id, next);
    reload();
    notify("Nome atualizado.", "ok");
  }

  function pickFile(file: string) {
    setSelectedFile(file);
    setDraft(files[file] || "");
  }

  async function exportZip() {
    const blob = await zipProject(activeProject.meta.name, activeProject.files);
    downloadBlob(blob, `${activeProject.spec.slug || "aplicativo"}.zip`);
    notify("Projeto ZIP baixado.", "ok");
  }

  async function startBuild() {
    const token = settings.githubToken?.trim();
    let user = settings.githubUser;
    if (!token) {
      notify("Conecte o GitHub nas Configurações antes de gerar o APK.", "error");
      return;
    }
    setBuild({ phase: "publishing", message: "Validando a conta do GitHub…" });
    try {
      if (!user) {
        const me = await githubWhoAmI(token);
        if (!me.ok || !me.login) throw new Error(me.message);
        user = me.login;
        updateSettings({ ...settings, githubUser: user });
      }
      const published = await publishProject(token, user, activeProject.spec.slug || "novaforge-app", activeProject.files, (_done, _total, message) => {
        setBuild((state) => ({ ...state, phase: "publishing", message }));
      });
      if (!published.ok || !published.repo || !published.commitSha) throw new Error(published.message);
      const next: BuildState = { phase: "waiting", message: "APK na fila de compilação…", repo: published.repo, commitSha: published.commitSha };
      setBuild(next);
      void monitorBuild(token, user, published.repo, published.commitSha);
    } catch (error) {
      setBuild({ phase: "error", message: error instanceof Error ? error.message : "Falha ao preparar o APK." });
    }
  }

  async function monitorBuild(token: string, user: string, repo: string, commitSha?: string) {
    const monitorId = ++monitorRef.current;
    for (let attempt = 0; attempt < 48; attempt += 1) {
      if (monitorRef.current !== monitorId) return;
      const result = await findWorkflowRun(token, user, repo, commitSha);
      if (!result.ok || !result.run) {
        setBuild((state) => ({ ...state, phase: "waiting", message: result.message }));
        await wait(5000);
        continue;
      }
      const run = result.run;
      if (run.status !== "completed") {
        setBuild((state) => ({ ...state, phase: "waiting", run, message: run.status === "queued" ? "APK aguardando na fila…" : "Compilando o APK…" }));
        await wait(6000);
        continue;
      }
      if (run.conclusion !== "success") {
        setBuild((state) => ({ ...state, phase: "error", run, message: `A compilação terminou com status: ${run.conclusion || "erro"}.` }));
        return;
      }
      const artifactResult = await latestArtifact(token, user, repo, run.id);
      if (!artifactResult.ok || !artifactResult.artifact) {
        setBuild((state) => ({ ...state, phase: "waiting", run, message: artifactResult.message }));
        await wait(3500);
        continue;
      }
      setBuild((state) => ({ ...state, phase: "success", run, artifact: artifactResult.artifact, message: "APK concluído e pronto para baixar." }));
      notify("APK concluído! O download já está disponível.", "ok");
      return;
    }
    setBuild((state) => ({ ...state, phase: "error", message: "A espera passou do tempo previsto. Toque em Verificar novamente." }));
  }

  async function resumeBuild() {
    const token = settings.githubToken?.trim();
    const user = settings.githubUser;
    const repo = build.repo || activeProject.spec.slug;
    if (!token || !user || !repo) {
      notify("Conecte novamente o GitHub para verificar.", "error");
      return;
    }
    setBuild((state) => ({ ...state, phase: "waiting", message: "Verificando a compilação…" }));
    void monitorBuild(token, user, repo, build.commitSha);
  }

  async function getApk() {
    const token = settings.githubToken?.trim();
    if (!token || !build.artifact) return;
    const result = await downloadArtifact(token, build.artifact, `${activeProject.spec.slug}-apk`);
    notify(result.message, result.ok ? "ok" : "error");
  }

  return (
    <main className="project-page">
      <header className="project-header">
        <button className="icon-button" aria-label="Voltar aos projetos" onClick={back}><ArrowLeft size={21} /></button>
        <div className="project-name-edit">
          <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onBlur={saveName} aria-label="Nome do projeto" />
          <span>{project.spec.category.replace("-", " + ")} · salvo</span>
        </div>
        <button className="icon-button" aria-label="Salvar nome" onClick={saveName}><Save size={19} /></button>
      </header>

      <nav className="project-tabs" aria-label="Ferramentas do projeto">
        <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}><Eye size={17} /> Prévia</button>
        <button className={tab === "code" ? "active" : ""} onClick={() => { setTab("code"); pickFile(currentFile); }}><Code2 size={17} /> Código</button>
        <button className={tab === "export" ? "active" : ""} onClick={() => setTab("export")}><PackageCheck size={17} /> APK</button>
        <button className={tab === "versions" ? "active" : ""} onClick={() => setTab("versions")}><History size={17} /> Versões</button>
      </nav>

      {tab === "preview" ? (
        <section className="preview-tab">
          <div className="phone-preview">
            <div className="phone-bar"><span /><span>{project.meta.name}</span><span /></div>
            <iframe title={`Prévia de ${project.meta.name}`} sandbox="allow-scripts allow-forms allow-modals" srcDoc={compilePreviewHtml(files, `preview_${id}_`)} />
          </div>
          {project.meta.status === "error" ? (
            <div className="error-card"><AlertTriangle size={18} /><div><strong>Esta versão contém um erro</strong><p>{project.meta.lastError}</p><button onClick={() => { restoreWorking(id); reload(); notify("Última versão funcional restaurada.", "ok"); }}><RotateCcw size={16} /> Restaurar</button></div></div>
          ) : null}
          <div className="change-card">
            <label htmlFor="change">Pedir uma alteração</label>
            <textarea id="change" value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Ex.: mude a cor para azul, adicione clientes ou troque o nome..." />
            <button className="primary-button full" disabled={busy} onClick={() => void applyChange()}>{busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />} Aplicar alteração</button>
          </div>
        </section>
      ) : null}

      {tab === "code" ? (
        <section className="code-tab">
          <div className="file-strip">{names.map((file) => <button key={file} className={currentFile === file ? "active" : ""} onClick={() => pickFile(file)}>{file.replace("www/", "")}</button>)}</div>
          <div className="editor-heading"><span><Code2 size={17} /> {currentFile}</span><button onClick={() => { restoreWorking(id); reload(); pickFile(currentFile); notify("Código restaurado.", "ok"); }}><RotateCcw size={15} /> Restaurar</button></div>
          <textarea className="code-editor" spellCheck={false} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button className="primary-button full editor-save" onClick={() => { const updated = saveCodeEdit(id, { ...files, [currentFile]: draft }); reload(); notify(updated.meta.status === "error" ? updated.meta.lastError || "Erro no código." : "Código salvo e prévia atualizada.", updated.meta.status === "error" ? "error" : "ok"); }}><Save size={18} /> Salvar código</button>
        </section>
      ) : null}

      {tab === "export" ? (
        <section className="export-tab">
          <div className="export-hero"><span className="export-icon"><PackageCheck size={30} /></span><div><p className="eyebrow">ANDROID</p><h2>Seu aplicativo pronto para sair da forja</h2><p>Baixe o código agora ou gere o APK pelo GitHub Actions.</p></div></div>
          <article className="export-card">
            <div><FileArchive size={20} /><span><strong>Projeto completo</strong><small>Código, Capacitor e automação Android</small></span></div>
            <button className="secondary-button full" onClick={() => void exportZip()}><Download size={17} /> Baixar ZIP</button>
          </article>
          <article className="export-card featured">
            <div><Github size={20} /><span><strong>Gerar APK automaticamente</strong><small>Uma publicação e apenas uma compilação</small></span></div>
            {build.phase !== "idle" ? <BuildStatus state={build} /> : null}
            {build.phase === "success" && build.artifact ? (
              <button className="primary-button full" onClick={() => void getApk()}><Download size={18} /> Baixar APK</button>
            ) : build.phase === "waiting" || build.phase === "publishing" ? (
              <button className="primary-button full" disabled><LoaderCircle className="spin" size={18} /> {build.phase === "publishing" ? "Enviando projeto" : "Compilando"}</button>
            ) : (
              <button className="primary-button full" onClick={() => void startBuild()}><Hammer size={18} /> Gerar APK</button>
            )}
            {build.phase !== "idle" && build.phase !== "publishing" ? <button className="text-button full" onClick={() => void resumeBuild()}><RefreshCw size={16} /> Verificar novamente</button> : null}
            {build.run?.htmlUrl ? <a className="text-link" href={build.run.htmlUrl} target="_blank" rel="noreferrer"><Github size={15} /> Ver detalhes no GitHub</a> : null}
          </article>
          <div className="privacy-note"><ShieldCheck size={18} /><p><strong>Seus dados permanecem seus.</strong> O projeto funciona offline. O token do GitHub fica somente neste aparelho.</p></div>
        </section>
      ) : null}

      {tab === "versions" ? <VersionsTab versions={versions} restore={(versionId) => { restoreVersion(id, versionId); reload(); notify("Versão restaurada com sucesso.", "ok"); }} /> : null}
    </main>
  );
}

function BuildStatus({ state }: { state: BuildState }) {
  const Icon = state.phase === "success" ? CheckCircle2 : state.phase === "error" ? AlertTriangle : LoaderCircle;
  return (
    <div className={`build-status ${state.phase}`}>
      <Icon className={state.phase === "waiting" || state.phase === "publishing" ? "spin" : ""} size={18} />
      <div><strong>{state.phase === "success" ? "APK concluído" : state.phase === "error" ? "Atenção necessária" : "Em andamento"}</strong><p>{state.message}</p></div>
    </div>
  );
}

function VersionsTab({ versions, restore }: { versions: VersionSnap[]; restore: (id: string) => void }) {
  return (
    <section className="versions-tab">
      <div className="title-block compact"><p className="eyebrow">PROTEÇÃO AUTOMÁTICA</p><h1>Versões salvas</h1><p>Restaure qualquer ponto anterior sem perder o backup geral.</p></div>
      {versions.length ? (
        <div className="version-list">{versions.map((version, index) => (
          <article key={version.id}><span className="version-dot">{index === 0 ? <Check size={15} /> : index + 1}</span><div><strong>{version.label}</strong><p>{formatTime(version.createdAt)}</p><small>{Object.keys(version.files).length} arquivos</small></div><button onClick={() => restore(version.id)}><RotateCcw size={16} /> Restaurar</button></article>
        ))}</div>
      ) : <EmptyState icon={History} title="Nenhuma versão anterior" text="As versões aparecem automaticamente depois de cada alteração." />}
    </section>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }: { icon: typeof Sparkles; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state"><span><Icon size={26} /></span><h3>{title}</h3><p>{text}</p>{action && onAction ? <button className="secondary-button" onClick={onAction}>{action}<ArrowRight size={16} /></button> : null}</div>
  );
}

function Toast({ toast, close }: { toast: NonNullable<ToastState>; close: () => void }) {
  const Icon = toast.tone === "ok" ? CheckCircle2 : toast.tone === "error" ? AlertTriangle : Sparkles;
  return (
    <div className={`toast tone-${toast.tone}`} role="status"><Icon size={18} /><span>{toast.message}</span><button aria-label="Fechar aviso" onClick={close}><X size={16} /></button></div>
  );
}
