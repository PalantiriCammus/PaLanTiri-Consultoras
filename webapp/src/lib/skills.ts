// Catálogo de habilidades/tecnologías para el "Index de Skills" del formulario de
// búsqueda. Agrupado por categoría. El usuario clickea para agregar/quitar y se
// guardan en el campo habilidades_requeridas (texto, separado por comas).
// Ampliable: agregá las que falten para tu mercado.

export const CATALOGO_SKILLS: { grupo: string; skills: string[] }[] = [
  {
    grupo: "Desarrollo / Programación",
    skills: [
      "JavaScript", "TypeScript", "Python", "Java", "C#", ".NET", "PHP", "Go",
      "React", "Angular", "Vue", "Node.js", "Next.js", "Django", "Laravel",
      "Spring", "React Native", "Flutter", "HTML", "CSS", "REST APIs", "GraphQL",
    ],
  },
  {
    grupo: "Datos / BI",
    skills: [
      "SQL", "PostgreSQL", "MySQL", "SQL Server", "MongoDB", "Power BI", "Tableau",
      "Excel avanzado", "Python (Pandas)", "ETL", "Data Warehouse", "Looker",
    ],
  },
  {
    grupo: "Infraestructura / Cloud / DevOps",
    skills: [
      "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Linux", "CI/CD",
      "Terraform", "Git", "Redes", "Ciberseguridad",
    ],
  },
  {
    grupo: "Diseño / Producto",
    skills: [
      "Figma", "Adobe Photoshop", "Adobe Illustrator", "UX/UI", "Canva",
      "Diseño gráfico", "Edición de video",
    ],
  },
  {
    grupo: "Administración / Finanzas",
    skills: [
      "Tango Gestión", "SAP", "Bejerman", "Liquidación de sueldos", "Conciliaciones",
      "Cuentas por pagar", "Cuentas por cobrar", "Impuestos", "Facturación",
      "Normas IFRS", "Presupuestos",
    ],
  },
  {
    grupo: "Comercial / Marketing",
    skills: [
      "Ventas B2B", "Ventas B2C", "CRM", "HubSpot", "Salesforce", "Negociación",
      "Marketing digital", "Google Ads", "Meta Ads", "SEO", "Community Management",
      "Email marketing",
    ],
  },
  {
    grupo: "Industria / Operaciones",
    skills: [
      "AutoCAD", "SolidWorks", "Mantenimiento industrial", "Lean Manufacturing",
      "Control de calidad", "Logística", "Gestión de stock", "PLC", "Soldadura",
      "Seguridad e higiene",
    ],
  },
  {
    grupo: "Idiomas",
    skills: [
      "Inglés básico", "Inglés intermedio", "Inglés avanzado", "Portugués",
      "Italiano", "Francés", "Alemán",
    ],
  },
  {
    grupo: "Habilidades blandas",
    skills: [
      "Trabajo en equipo", "Liderazgo", "Comunicación", "Proactividad",
      "Resolución de problemas", "Orientación al cliente", "Adaptabilidad",
      "Gestión del tiempo", "Pensamiento analítico", "Manejo de equipos",
    ],
  },
  {
    grupo: "Gestión / Metodologías",
    skills: [
      "Scrum", "Kanban", "Agile", "Jira", "Gestión de proyectos", "PMO",
      "Atención al cliente", "Trello", "Office 365",
    ],
  },
];
