import { slugify } from "./id.ts";
import type {
  AppSpec,
  Category,
  EntitySpec,
  FieldSpec,
  ScreenSpec,
  ThemeMode,
} from "./types.ts";

const COLOR_NAMES: Record<string, string> = {
  azul: "#2563eb",
  blue: "#2563eb",
  verde: "#0f766e",
  green: "#0f766e",
  teal: "#0f766e",
  vermelho: "#b42318",
  red: "#b42318",
  laranja: "#c2410c",
  orange: "#c2410c",
  preto: "#18181b",
  black: "#18181b",
  branco: "#f4f4f5",
  white: "#f4f4f5",
  cinza: "#52525b",
  gray: "#52525b",
  rosa: "#be185d",
  pink: "#be185d",
  roxo: "#6d28d9",
  purple: "#6d28d9",
  amarelo: "#ca8a04",
  yellow: "#ca8a04",
};

export const CATEGORIES: { id: Category; label: string; blurb: string; sample: string }[] = [
  { id: "vendas-estoque", label: "Vendas e estoque", blurb: "Produtos, vendas, lucro e relatórios", sample: "Controle de estoque e vendas da minha loja" },
  { id: "vendas", label: "Vendas", blurb: "Registrar vendas e totais", sample: "Aplicativo para registrar minhas vendas do dia" },
  { id: "estoque", label: "Estoque", blurb: "Entrada, saída e saldo", sample: "Controle de estoque com entrada e saída" },
  { id: "financas", label: "Finanças pessoais", blurb: "Receitas, despesas e saldo", sample: "Finanças pessoais com receitas e despesas" },
  { id: "orcamento", label: "Orçamento", blurb: "Limites por categoria", sample: "Orçamento mensal por categoria" },
  { id: "tarefas", label: "Lista de tarefas", blurb: "Pendências e conclusão", sample: "Lista de tarefas com prazo e prioridade" },
  { id: "habitos", label: "Hábitos", blurb: "Marcar o dia e ver sequência", sample: "Hábitos diários com histórico" },
  { id: "catalogo", label: "Catálogo", blurb: "Itens, preços e busca", sample: "Catálogo de produtos com preços" },
  { id: "agenda", label: "Agenda", blurb: "Compromissos e lembretes", sample: "Agenda de compromissos da semana" },
  { id: "delivery", label: "Delivery", blurb: "Pedidos e status", sample: "Delivery com pedidos e status de entrega" },
  { id: "formulario", label: "Formulário", blurb: "Coletar respostas", sample: "Formulário de inscrição com lista de enviados" },
  { id: "calculadora", label: "Calculadora", blurb: "Contas na hora", sample: "Calculadora simples com histórico" },
  { id: "clientes", label: "Clientes", blurb: "Cadastro e busca", sample: "Cadastro de clientes com telefone e anotações" },
  { id: "produtividade", label: "Produtividade", blurb: "Notas e tarefas juntas", sample: "Produtividade com notas e tarefas" },
  { id: "ferramentas", label: "Ferramentas", blurb: "Utilitário rápido", sample: "Ferramentas: conversor de medidas" },
  { id: "notas", label: "Notas", blurb: "Anotações rápidas", sample: "Bloco de notas simples" },
];

function field(key: string, label: string, type: FieldSpec["type"], extra: Partial<FieldSpec> = {}): FieldSpec {
  return { key, label, type, ...extra };
}

function productFields(): FieldSpec[] {
  return [
    field("name", "Nome", "text", { required: true }),
    field("code", "Código", "text"),
    field("category", "Categoria", "select", {
      options: ["Geral", "Alimentos", "Bebidas", "Limpeza", "Eletrônicos", "Roupas", "Outros"],
    }),
    field("costPrice", "Preço de compra", "money", { required: true, min: 0 }),
    field("salePrice", "Preço de venda", "money", { required: true, min: 0 }),
    field("stock", "Estoque", "number", { required: true, min: 0 }),
    field("notes", "Observações", "textarea"),
  ];
}

function saleFields(): FieldSpec[] {
  return [
    field("productId", "Produto", "ref", { required: true, refEntity: "products", refLabel: "name" }),
    field("qty", "Quantidade", "number", { required: true, min: 1, step: 1 }),
    field("unitPrice", "Preço unitário", "money", { required: true }),
    field("costPrice", "Custo unitário", "money"),
    field("total", "Total", "money"),
    field("profit", "Lucro", "money"),
    field("date", "Data", "date", { required: true }),
    field("notes", "Observações", "textarea"),
  ];
}

function clientFields(): FieldSpec[] {
  return [
    field("name", "Nome", "text", { required: true }),
    field("phone", "Telefone", "tel"),
    field("email", "E-mail", "email"),
    field("city", "Cidade", "text"),
    field("notes", "Anotações", "textarea"),
  ];
}

function detectLocale(prompt: string): "pt-BR" | "en" {
  const pt = /(ção|ões|para|minha|meu|aplicativo|estoque|vendas|tarefas|hábitos|compromisso)/i.test(prompt);
  const en = /(create|app|inventory|sales|tasks|habits|budget|calculator)/i.test(prompt);
  if (en && !pt) return "en";
  return "pt-BR";
}

function detectCategory(p: string): Category {
  const s = p.toLowerCase();
  const hasSales = /(venda|vendas|sales|pdv|loja)/.test(s);
  const hasStock = /(estoque|invent[aá]rio|stock|inventory|produto)/.test(s);
  if (hasSales && hasStock) return "vendas-estoque";
  if (hasStock) return "estoque";
  if (hasSales) return "vendas";
  if (/(h[aá]bito|habit)/.test(s)) return "habitos";
  if (/(tarefa|todo|to-do|pend[eê]ncia|checklist)/.test(s)) return "tarefas";
  if (/(agenda|compromisso|evento|calendar|appointment)/.test(s)) return "agenda";
  if (/(delivery|entrega|pedido de|pedidos)/.test(s)) return "delivery";
  if (/(or[cç]amento|budget)/.test(s)) return "orcamento";
  if (/(finan[cç]|despesa|receita|gasto|money|expense|income)/.test(s)) return "financas";
  if (/(calculadora|calculator|calcular)/.test(s)) return "calculadora";
  if (/(cliente|crm|customer)/.test(s)) return "clientes";
  if (/(cat[aá]logo|card[aá]pio|catalog)/.test(s)) return "catalogo";
  if (/(formul[aá]rio|inscri[cç][aã]o|pesquisa|quiz|form\b)/.test(s)) return "formulario";
  if (/(nota|anota[cç]|notes)/.test(s)) return "notas";
  if (/(produtividade|pomodoro|foco)/.test(s)) return "produtividade";
  if (/(ferramenta|converter|conversor|utilit[aá]rio)/.test(s)) return "ferramentas";
  return "generico";
}

function detectName(prompt: string, category: Category): string {
  const quoted = prompt.match(/[“"]([^”"]{2,40})[”"]/) ?? prompt.match(/'([^']{2,40})'/);
  if (quoted?.[1]) return quoted[1];
  const chamado = prompt.match(/(?:chamado|nomeado|named|called)\s+([A-Za-zÀ-ÿ0-9 ]{2,40})/i);
  if (chamado?.[1]) return chamado[1].trim();
  const labels: Record<Category, string> = {
    "vendas-estoque": "Minha Loja",
    vendas: "Minhas Vendas",
    estoque: "Meu Estoque",
    financas: "Minhas Finanças",
    orcamento: "Meu Orçamento",
    tarefas: "Minhas Tarefas",
    habitos: "Meus Hábitos",
    catalogo: "Catálogo",
    agenda: "Minha Agenda",
    delivery: "Meus Pedidos",
    formulario: "Formulário",
    calculadora: "Calculadora",
    ferramentas: "Ferramentas",
    produtividade: "Foco",
    clientes: "Meus Clientes",
    notas: "Minhas Notas",
    generico: "Meu Aplicativo",
  };
  return labels[category];
}

function detectColor(prompt: string): string {
  const s = prompt.toLowerCase();
  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    if (s.includes(name)) return hex;
  }
  const hex = prompt.match(/#([0-9a-fA-F]{6})/);
  if (hex) return `#${hex[1]}`;
  return "#0f766e";
}

function detectThemeMode(prompt: string): ThemeMode {
  if (/(escuro|dark mode|modo escuro)/i.test(prompt)) return "dark";
  if (/(claro|light mode|modo claro)/i.test(prompt)) return "light";
  return "light";
}

function contrastFg(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#f8fafc";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.55 ? "#0b0d10" : "#f8fafc";
}

function wants(prompt: string, re: RegExp): boolean {
  return re.test(prompt);
}

function baseSpec(prompt: string, category: Category, name: string): AppSpec {
  const primary = detectColor(prompt);
  return {
    name,
    slug: slugify(name),
    description: prompt.trim().slice(0, 240) || name,
    category,
    audience: "uso pessoal no celular",
    locale: detectLocale(prompt),
    theme: { mode: detectThemeMode(prompt), primary, primaryFg: contrastFg(primary), accent: primary },
    screens: [],
    entities: [],
    calculations: [],
    hooks: [],
    reports: [],
    storage: "localStorage",
    offline: true,
    needsInternet: false,
    permissions: [],
    integrations: [],
    features: [],
    prompt,
  };
}

function nav(id: string, title: string, type: ScreenSpec["type"], icon: string, entity?: string): ScreenSpec {
  return { id, title, type, icon, entity, nav: true };
}

export function specFromCategory(category: Category, prompt = "", name?: string): AppSpec {
  const spec = baseSpec(prompt || category, category, name ?? detectName(prompt || category, category));
  const includeClients = wants(prompt, /cliente|customer|crm/);
  const includeLogin = wants(prompt, /login|senha|autentic/);
  const includeSearch = wants(prompt, /busca|pesquis|search/) || true;
  const includeReport = wants(prompt, /relat[oó]rio|lucro|dashboard|m[eê]s/) || true;

  const addLogin = () => {
    if (includeLogin) spec.screens.unshift(nav("login", "Entrar", "login", "lock"));
  };

  switch (category) {
    case "vendas-estoque":
    case "vendas":
    case "estoque": {
      spec.entities.push({
        key: "products",
        label: "Produto",
        plural: "Produtos",
        icon: "box",
        fields: productFields(),
        search: ["name", "code", "category"],
        filters: [{ key: "category", label: "Categoria" }],
        sortKey: "name",
      });
      if (category !== "estoque") {
        spec.entities.push({
          key: "sales",
          label: "Venda",
          plural: "Vendas",
          icon: "receipt",
          fields: saleFields(),
          search: ["notes"],
          sortKey: "date",
          sortDir: "desc",
        });
        spec.calculations.push(
          { id: "saleTotal", entity: "sales", field: "total", expr: "qty * unitPrice" },
          { id: "saleProfit", entity: "sales", field: "profit", expr: "qty * (unitPrice - costPrice)" },
        );
        spec.hooks.push({
          on: "afterSave",
          entity: "sales",
          action: "decrement",
          targetEntity: "products",
          matchField: "productId",
          targetField: "stock",
          byField: "qty",
        });
        spec.reports.push({ id: "monthly", title: "Vendas por mês", entity: "sales", groupBy: "month" });
      }
      if (includeClients) {
        spec.entities.push({
          key: "clients",
          label: "Cliente",
          plural: "Clientes",
          icon: "users",
          fields: clientFields(),
          search: ["name", "phone", "city"],
        });
      }
      spec.screens = [
        {
          id: "home",
          title: "Início",
          type: "dashboard",
          icon: "home",
          nav: true,
          widgets: [
            { kind: "kpi", id: "skus", label: "Produtos", entity: "products", op: "count" },
            ...(category === "estoque"
              ? [{ kind: "kpi" as const, id: "units", label: "Itens em estoque", entity: "products", op: "sum" as const, field: "stock" }]
              : [
                  { kind: "kpi" as const, id: "month", label: "Vendas do mês", entity: "sales", op: "monthSum" as const, field: "total" },
                  { kind: "kpi" as const, id: "profit", label: "Lucro do mês", entity: "sales", op: "profit" as const, field: "profit" },
                ]),
          ],
        },
        nav("products", "Produtos", "list", "box", "products"),
      ];
      if (category !== "estoque") spec.screens.push(nav("sales", "Vendas", "list", "receipt", "sales"));
      if (includeClients) spec.screens.push(nav("clients", "Clientes", "list", "users", "clients"));
      if (includeReport && category !== "estoque") spec.screens.push(nav("reports", "Relatórios", "report", "chart"));
      spec.screens.push(nav("settings", "Ajustes", "settings", "settings"));
      spec.features = ["CRUD de produtos", "Estoque", ...(category === "estoque" ? [] : ["Vendas", "Lucro", "Relatório mensal"]), "Busca", "Offline"];
      break;
    }
    case "financas":
    case "orcamento": {
      spec.entities.push({
        key: "tx",
        label: "Lançamento",
        plural: "Lançamentos",
        icon: "wallet",
        fields: [
          field("title", "Descrição", "text", { required: true }),
          field("kind", "Tipo", "select", { required: true, options: ["Receita", "Despesa"] }),
          field("category", "Categoria", "select", {
            options: ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Salário", "Outros"],
          }),
          field("amount", "Valor", "money", { required: true, min: 0 }),
          field("date", "Data", "date", { required: true }),
          field("notes", "Notas", "textarea"),
        ],
        search: ["title", "category"],
        filters: [{ key: "kind", label: "Tipo" }, { key: "category", label: "Categoria" }],
        sortKey: "date",
        sortDir: "desc",
      });
      if (category === "orcamento") {
        spec.entities.push({
          key: "budgets",
          label: "Limite",
          plural: "Orçamentos",
          icon: "target",
          fields: [
            field("category", "Categoria", "text", { required: true }),
            field("limit", "Limite mensal", "money", { required: true }),
          ],
        });
      }
      spec.screens = [
        {
          id: "home",
          title: "Resumo",
          type: "dashboard",
          icon: "home",
          nav: true,
          widgets: [
            { kind: "kpi", id: "in", label: "Receitas do mês", entity: "tx", op: "monthSum", field: "amount", hint: "Receita" },
            { kind: "kpi", id: "out", label: "Despesas do mês", entity: "tx", op: "monthSum", field: "amount", hint: "Despesa" },
          ],
        },
        nav("tx", "Lançamentos", "list", "wallet", "tx"),
      ];
      if (category === "orcamento") spec.screens.push(nav("budgets", "Limites", "list", "target", "budgets"));
      spec.screens.push(nav("reports", "Relatórios", "report", "chart"), nav("settings", "Ajustes", "settings", "settings"));
      spec.reports.push({ id: "monthly", title: "Por mês", entity: "tx", groupBy: "month" });
      spec.features = ["Receitas e despesas", "Saldo mensal", "Busca", "Offline"];
      break;
    }
    case "tarefas":
    case "produtividade": {
      spec.entities.push({
        key: "tasks",
        label: "Tarefa",
        plural: "Tarefas",
        icon: "check",
        fields: [
          field("title", "Título", "text", { required: true }),
          field("done", "Concluída", "bool"),
          field("priority", "Prioridade", "select", { options: ["Alta", "Média", "Baixa"] }),
          field("due", "Prazo", "date"),
          field("notes", "Detalhes", "textarea"),
        ],
        search: ["title", "notes"],
        filters: [{ key: "priority", label: "Prioridade" }, { key: "done", label: "Status" }],
      });
      if (category === "produtividade") {
        spec.entities.push({
          key: "notes",
          label: "Nota",
          plural: "Notas",
          icon: "file",
          fields: [field("title", "Título", "text", { required: true }), field("body", "Conteúdo", "textarea")],
          search: ["title", "body"],
        });
      }
      spec.screens = [
        { id: "home", title: "Hoje", type: "dashboard", icon: "home", nav: true, widgets: [{ kind: "kpi", id: "open", label: "Abertas", entity: "tasks", op: "count" }] },
        nav("tasks", "Tarefas", "list", "check", "tasks"),
      ];
      if (category === "produtividade") spec.screens.push(nav("notes", "Notas", "list", "file", "notes"));
      spec.screens.push(nav("settings", "Ajustes", "settings", "settings"));
      spec.features = ["Tarefas", "Prioridade", "Prazo", "Offline"];
      break;
    }
    case "habitos": {
      spec.entities.push(
        {
          key: "habits",
          label: "Hábito",
          plural: "Hábitos",
          icon: "repeat",
          fields: [field("name", "Nome", "text", { required: true }), field("notes", "Motivação", "textarea")],
          search: ["name"],
        },
        {
          key: "checkins",
          label: "Check-in",
          plural: "Check-ins",
          icon: "check",
          fields: [
            field("habitId", "Hábito", "ref", { required: true, refEntity: "habits", refLabel: "name" }),
            field("date", "Data", "date", { required: true }),
          ],
        },
      );
      spec.screens = [
        nav("home", "Hoje", "habits", "repeat"),
        nav("habits", "Hábitos", "list", "list", "habits"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.features = ["Marcar o dia", "Sequência", "Histórico", "Offline"];
      break;
    }
    case "agenda": {
      spec.entities.push({
        key: "events",
        label: "Compromisso",
        plural: "Compromissos",
        icon: "calendar",
        fields: [
          field("title", "Título", "text", { required: true }),
          field("date", "Data", "date", { required: true }),
          field("time", "Horário", "time"),
          field("place", "Local", "text"),
          field("notes", "Notas", "textarea"),
        ],
        search: ["title", "place"],
        sortKey: "date",
      });
      spec.screens = [
        nav("home", "Agenda", "calendar", "calendar", "events"),
        nav("events", "Lista", "list", "list", "events"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.features = ["Compromissos", "Calendário", "Offline"];
      break;
    }
    case "delivery": {
      spec.entities.push(
        {
          key: "orders",
          label: "Pedido",
          plural: "Pedidos",
          icon: "truck",
          fields: [
            field("customer", "Cliente", "text", { required: true }),
            field("phone", "Telefone", "tel"),
            field("items", "Itens", "textarea", { required: true }),
            field("total", "Total", "money", { required: true }),
            field("status", "Status", "select", {
              required: true,
              options: ["Novo", "Preparando", "Saiu para entrega", "Entregue", "Cancelado"],
            }),
            field("date", "Data", "date", { required: true }),
            field("address", "Endereço", "textarea"),
          ],
          search: ["customer", "phone", "items"],
          filters: [{ key: "status", label: "Status" }],
          sortKey: "date",
          sortDir: "desc",
        },
      );
      spec.screens = [
        {
          id: "home",
          title: "Painel",
          type: "dashboard",
          icon: "home",
          nav: true,
          widgets: [{ kind: "kpi", id: "open", label: "Pedidos", entity: "orders", op: "count" }],
        },
        nav("orders", "Pedidos", "list", "truck", "orders"),
        nav("reports", "Relatórios", "report", "chart"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.reports.push({ id: "byStatus", title: "Por status", entity: "orders", groupBy: "status" });
      spec.features = ["Pedidos", "Status", "Totais", "Offline"];
      break;
    }
    case "clientes": {
      spec.entities.push({
        key: "clients",
        label: "Cliente",
        plural: "Clientes",
        icon: "users",
        fields: clientFields(),
        search: ["name", "phone", "email", "city"],
      });
      spec.screens = [
        { id: "home", title: "Início", type: "dashboard", icon: "home", nav: true, widgets: [{ kind: "kpi", id: "n", label: "Clientes", entity: "clients", op: "count" }] },
        nav("clients", "Clientes", "list", "users", "clients"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.features = ["Cadastro", "Busca", "Offline"];
      break;
    }
    case "catalogo": {
      spec.entities.push({
        key: "items",
        label: "Item",
        plural: "Itens",
        icon: "grid",
        fields: [
          field("name", "Nome", "text", { required: true }),
          field("category", "Categoria", "text"),
          field("price", "Preço", "money", { required: true }),
          field("desc", "Descrição", "textarea"),
        ],
        search: ["name", "category", "desc"],
      });
      spec.screens = [
        nav("home", "Catálogo", "catalog", "grid", "items"),
        nav("items", "Gerenciar", "list", "list", "items"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.features = ["Catálogo", "Busca", "Preços"];
      break;
    }
    case "formulario": {
      spec.entities.push({
        key: "entries",
        label: "Resposta",
        plural: "Respostas",
        icon: "file",
        fields: [
          field("name", "Nome", "text", { required: true }),
          field("email", "E-mail", "email"),
          field("phone", "Telefone", "tel"),
          field("message", "Mensagem", "textarea", { required: true }),
        ],
        search: ["name", "email", "message"],
      });
      spec.screens = [
        nav("home", "Formulário", "form", "file", "entries"),
        nav("entries", "Enviados", "list", "list", "entries"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.features = ["Formulário", "Lista de respostas"];
      break;
    }
    case "calculadora": {
      spec.screens = [nav("home", "Calculadora", "calculator", "hash"), nav("settings", "Ajustes", "settings", "settings")];
      spec.features = ["Cálculos reais", "Histórico"];
      break;
    }
    case "ferramentas": {
      spec.screens = [nav("home", "Conversor", "calculator", "hash"), nav("settings", "Ajustes", "settings", "settings")];
      spec.features = ["Conversor", "Offline"];
      spec.entities.push({
        key: "history",
        label: "Cálculo",
        plural: "Histórico",
        icon: "clock",
        fields: [field("expr", "Expressão", "text"), field("result", "Resultado", "text")],
      });
      break;
    }
    default: {
      spec.entities.push({
        key: "notes",
        label: "Nota",
        plural: "Notas",
        icon: "file",
        fields: [field("title", "Título", "text", { required: true }), field("body", "Conteúdo", "textarea")],
        search: ["title", "body"],
      });
      spec.screens = [
        { id: "home", title: "Início", type: "dashboard", icon: "home", nav: true, widgets: [{ kind: "kpi", id: "n", label: "Notas", entity: "notes", op: "count" }] },
        nav("notes", "Notas", "list", "file", "notes"),
        nav("settings", "Ajustes", "settings", "settings"),
      ];
      spec.features = ["Notas", "Offline"];
    }
  }

  addLogin();
  if (!includeSearch) {
    /* search is default-on for list screens in the runtime */
  }
  spec.screens = spec.screens.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
  return spec;
}

export function interpretPrompt(prompt: string): AppSpec {
  const text = prompt.trim();
  const category = detectCategory(text || "notas");
  const spec = specFromCategory(category, text);
  if (wants(text, /relat[oó]rio/) && !spec.screens.some((s) => s.type === "report") && spec.entities[0]) {
    spec.screens.splice(-1, 0, nav("reports", "Relatórios", "report", "chart"));
    spec.reports.push({ id: "main", title: "Resumo", entity: spec.entities[0].key, groupBy: "month" });
  }
  return spec;
}

export function specSummary(spec: AppSpec): string {
  const screens = spec.screens.map((s) => s.title).join(", ");
  const entities = spec.entities.map((e) => e.plural).join(", ");
  const bits = [
    `Nome: ${spec.name}`,
    `Objetivo: ${spec.description}`,
    screens ? `Telas: ${screens}` : "",
    entities ? `Dados: ${entities}` : "",
    spec.features.length ? `Recursos: ${spec.features.join(", ")}` : "",
    "Funciona offline neste aparelho.",
  ];
  return bits.filter(Boolean).join("\n");
}

export function applySpecPatch(spec: AppSpec, instruction: string): AppSpec {
  const next: AppSpec = JSON.parse(JSON.stringify(spec)) as AppSpec;
  const s = instruction.toLowerCase();

  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    if (s.includes(name) && /(cor|color|tema|theme|azul|verde|vermelho|blue|green)/.test(s)) {
      next.theme.primary = hex;
      next.theme.accent = hex;
      next.theme.primaryFg = contrastFg(hex);
    }
  }
  const hex = instruction.match(/#([0-9a-fA-F]{6})/);
  if (hex) {
    next.theme.primary = `#${hex[1]}`;
    next.theme.accent = `#${hex[1]}`;
    next.theme.primaryFg = contrastFg(`#${hex[1]}`);
  }
  if (/(escuro|dark)/.test(s)) next.theme.mode = "dark";
  if (/(claro|light)/.test(s) && !/(escuro)/.test(s)) next.theme.mode = "light";

  const rename = instruction.match(/(?:renomeie|renomear|chame de|nome)\s+(?:para\s+)?[“"'']?([^”"'\n]+)[”"']?/i);
  if (rename?.[1] && /(nome|renome)/.test(s)) {
    next.name = rename[1].trim();
    next.slug = slugify(next.name);
  }

  if (/(tela de clientes|cadastro de clientes|add clients?)/.test(s) && !next.entities.some((e) => e.key === "clients")) {
    next.entities.push({
      key: "clients",
      label: "Cliente",
      plural: "Clientes",
      icon: "users",
      fields: clientFields(),
      search: ["name", "phone"],
    });
    next.screens.splice(next.screens.length - 1, 0, nav("clients", "Clientes", "list", "users", "clients"));
    next.features.push("Clientes");
  }

  if (/(login|senha)/.test(s) && !next.screens.some((sc) => sc.type === "login")) {
    next.screens.unshift(nav("login", "Entrar", "login", "lock"));
    next.features.push("Tela de entrada");
  }

  if (/(busca|pesquis|search)/.test(s)) {
    for (const ent of next.entities) {
      if (!ent.search || ent.search.length === 0) {
        ent.search = ent.fields.filter((f) => f.type === "text").map((f) => f.key);
      }
    }
  }

  if (/(relat[oó]rio|por m[eê]s)/.test(s) && !next.screens.some((sc) => sc.type === "report")) {
    const ent = next.entities[0];
    if (ent) {
      next.screens.splice(-1, 0, nav("reports", "Relatórios", "report", "chart"));
      next.reports.push({ id: "auto", title: "Relatório", entity: ent.key, groupBy: "month" });
    }
  }

  return next;
}

export function mergeAiSpec(local: AppSpec, incoming: Partial<AppSpec> | null | undefined): AppSpec {
  if (!incoming || typeof incoming !== "object") return local;
  const merged: AppSpec = { ...local, ...incoming, theme: { ...local.theme, ...(incoming.theme ?? {}) } };
  if (!merged.entities?.length) merged.entities = local.entities;
  if (!merged.screens?.length) merged.screens = local.screens;
  merged.calculations = merged.calculations?.length ? merged.calculations : local.calculations;
  merged.hooks = merged.hooks?.length ? merged.hooks : local.hooks;
  merged.slug = slugify(merged.name || local.name);
  merged.prompt = local.prompt;
  return merged;
}
