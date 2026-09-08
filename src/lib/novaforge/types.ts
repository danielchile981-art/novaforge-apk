export type UiMode = "simple" | "advanced";
export type ThemeMode = "light" | "dark";

export type Category =
  | "vendas"
  | "estoque"
  | "vendas-estoque"
  | "financas"
  | "orcamento"
  | "tarefas"
  | "habitos"
  | "catalogo"
  | "agenda"
  | "delivery"
  | "formulario"
  | "calculadora"
  | "ferramentas"
  | "produtividade"
  | "clientes"
  | "notas"
  | "generico";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "time"
  | "select"
  | "bool"
  | "tel"
  | "email"
  | "ref";

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  refEntity?: string;
  refLabel?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type EntitySpec = {
  key: string;
  label: string;
  plural: string;
  icon: string;
  fields: FieldSpec[];
  search?: string[];
  filters?: { key: string; label: string }[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
};

export type ScreenType =
  | "dashboard"
  | "list"
  | "form"
  | "detail"
  | "report"
  | "calculator"
  | "calendar"
  | "habits"
  | "settings"
  | "login"
  | "catalog";

export type KpiWidget = {
  kind: "kpi";
  id: string;
  label: string;
  entity: string;
  op: "count" | "sum" | "monthSum" | "profit";
  field?: string;
  hint?: string;
};

export type ScreenSpec = {
  id: string;
  title: string;
  type: ScreenType;
  entity?: string;
  nav?: boolean;
  icon?: string;
  widgets?: KpiWidget[];
};

export type CalcSpec = {
  id: string;
  entity: string;
  field: string;
  expr: string;
};

export type HookSpec = {
  on: "afterSave";
  entity: string;
  action: "decrement" | "increment";
  targetEntity: string;
  matchField: string;
  targetField: string;
  byField: string;
};

export type AppSpec = {
  name: string;
  slug: string;
  description: string;
  category: Category;
  audience: string;
  locale: "pt-BR" | "en";
  theme: {
    mode: ThemeMode;
    primary: string;
    primaryFg: string;
    accent: string;
  };
  screens: ScreenSpec[];
  entities: EntitySpec[];
  calculations: CalcSpec[];
  hooks: HookSpec[];
  reports: { id: string; title: string; entity: string; groupBy?: "month" | "day" | "status" }[];
  storage: "localStorage";
  offline: boolean;
  needsInternet: boolean;
  permissions: string[];
  integrations: string[];
  features: string[];
  prompt: string;
};

export type ProjectStatus = "draft" | "ready" | "error" | "building";

export type ProjectMeta = {
  id: string;
  name: string;
  description: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  thumbnail: string;
  lastError?: string;
  source: "ai" | "template" | "blank" | "edit";
};

export type ProjectRecord = {
  meta: ProjectMeta;
  spec: AppSpec;
  files: Record<string, string>;
  lastWorkingFiles: Record<string, string>;
};

export type VersionSnap = {
  id: string;
  projectId: string;
  createdAt: string;
  label: string;
  files: Record<string, string>;
  spec: AppSpec;
};

export type HistoryKind =
  | "create"
  | "generate"
  | "modify"
  | "edit"
  | "restore"
  | "export"
  | "build"
  | "error"
  | "fix"
  | "duplicate";

export type HistoryEntry = {
  id: string;
  projectId?: string;
  at: string;
  kind: HistoryKind;
  title: string;
  detail?: string;
};

export type Settings = {
  theme: ThemeMode;
  mode: UiMode;
  githubToken?: string;
  githubUser?: string;
};

export type GenerateStage =
  | "interpretando"
  | "planejando"
  | "estrutura"
  | "funcionalidades"
  | "verificando"
  | "previa"
  | "concluido"
  | "erro";

export type GenerateProgress = {
  stage: GenerateStage;
  percent: number;
  message: string;
};

export type ValidationIssue = {
  level: "error" | "warning";
  file?: string;
  message: string;
  fix?: string;
};

export type GenerateResult = {
  ok: boolean;
  spec: AppSpec;
  files: Record<string, string>;
  issues: ValidationIssue[];
  provider: "xai" | "local";
  summary: string;
};
