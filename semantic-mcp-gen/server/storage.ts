import {
  projects, dbTables, dbColumns, dbRelationships, queryLogs,
  type Project, type InsertProject,
  type DbTable, type InsertDbTable,
  type DbColumn, type InsertDbColumn,
  type DbRelationship, type InsertDbRelationship,
  type QueryLog, type InsertQueryLog,
} from "@shared/schema";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Tables
  getTablesByProject(projectId: number): Promise<DbTable[]>;
  getTable(id: number): Promise<DbTable | undefined>;
  createTable(data: InsertDbTable): Promise<DbTable>;
  updateTable(id: number, data: Partial<InsertDbTable>): Promise<DbTable>;
  deleteTablesByProject(projectId: number): Promise<void>;

  // Columns
  getColumnsByProject(projectId: number): Promise<DbColumn[]>;
  getColumnsByTable(tableId: number): Promise<DbColumn[]>;
  createColumn(data: InsertDbColumn): Promise<DbColumn>;
  updateColumn(id: number, data: Partial<InsertDbColumn>): Promise<DbColumn>;

  // Relationships
  getRelationshipsByProject(projectId: number): Promise<DbRelationship[]>;
  createRelationship(data: InsertDbRelationship): Promise<DbRelationship>;
  updateRelationship(id: number, data: Partial<InsertDbRelationship>): Promise<DbRelationship>;
  deleteRelationshipsByProject(projectId: number): Promise<void>;

  // Query Logs
  getQueryLogs(projectId: number): Promise<QueryLog[]>;
  createQueryLog(data: InsertQueryLog): Promise<QueryLog>;

  // Manifest
  getManifest(projectId: number): Promise<object>;
}

export class MemStorage implements IStorage {
  private projects: Map<number, Project> = new Map();
  private tables: Map<number, DbTable> = new Map();
  private columns: Map<number, DbColumn> = new Map();
  private relationships: Map<number, DbRelationship> = new Map();
  private queryLogs: Map<number, QueryLog> = new Map();
  private nextId = { project: 1, table: 1, column: 1, relationship: 1, log: 1 };

  constructor() {
    this._seed();
  }

  private _seed() {
    // ─────────────────────────────────────────────
    // PROJECT 1: E-Commerce Platform
    // ─────────────────────────────────────────────
    const project1: Project = {
      id: 1,
      name: "E-Commerce Platform",
      description: "Main production database for our online store",
      dbType: "postgresql",
      connectionString: "postgresql://user:pass@localhost:5432/ecommerce",
      status: "ready",
      tableCount: 8,
      createdAt: new Date(),
    };
    this.projects.set(1, project1);

    const p1Tables: Omit<DbTable, "id">[] = [
      { projectId: 1, symbolicId: "T1", tableName: "users",         description: "Registered customer accounts with profile and auth data",          domain: "Users",   isHidden: false, isCore: true,  rowCount: 48200   },
      { projectId: 1, symbolicId: "T2", tableName: "orders",        description: "Customer purchase orders with status lifecycle",                   domain: "Sales",   isHidden: false, isCore: true,  rowCount: 312000  },
      { projectId: 1, symbolicId: "T3", tableName: "order_items",   description: "Line items within each order, linking products and quantities",    domain: "Sales",   isHidden: false, isCore: true,  rowCount: 890000  },
      { projectId: 1, symbolicId: "T4", tableName: "products",      description: "Product catalog with pricing, inventory, and descriptions",        domain: "Catalog", isHidden: false, isCore: true,  rowCount: 15400   },
      { projectId: 1, symbolicId: "T5", tableName: "categories",    description: "Hierarchical product categories",                                  domain: "Catalog", isHidden: false, isCore: false, rowCount: 240     },
      { projectId: 1, symbolicId: "T6", tableName: "payments",      description: "Payment transactions linked to orders",                            domain: "Finance", isHidden: false, isCore: false, rowCount: 308000  },
      { projectId: 1, symbolicId: "T7", tableName: "sys_audit_log", description: "Internal system audit trail — not for agent queries",              domain: "System",  isHidden: true,  isCore: false, rowCount: 2100000 },
      { projectId: 1, symbolicId: "T8", tableName: "addresses",     description: "Shipping and billing addresses for users",                         domain: "Users",   isHidden: false, isCore: false, rowCount: 72000   },
    ];
    p1Tables.forEach((t, i) => { const id = i + 1; this.tables.set(id, { ...t, id }); });

    // P1 columns — tableIds 1-8, columnIds 1-15
    const p1Cols: Omit<DbColumn, "id">[] = [
      // users (tableId=1)
      { tableId: 1, projectId: 1, symbolicId: "C1",  columnName: "id",         dataType: "integer",        description: "Primary key",                    isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "1",          maxValue: "48200"       },
      { tableId: 1, projectId: 1, symbolicId: "C2",  columnName: "email",      dataType: "varchar(255)",   description: "User email address",             isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: true,  isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: null,        maxValue: null          },
      { tableId: 1, projectId: 1, symbolicId: "C3",  columnName: "name",       dataType: "varchar(100)",   description: "Full name of the user",          isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: true,  isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: null,        maxValue: null          },
      { tableId: 1, projectId: 1, symbolicId: "C4",  columnName: "status",     dataType: "varchar(20)",    description: "Account status",                 isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["active","inactive","suspended"], minValue: null, maxValue: null },
      { tableId: 1, projectId: 1, symbolicId: "C5",  columnName: "created_at", dataType: "timestamp",      description: "Account creation date",          isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "2020-01-01", maxValue: "2026-03-01" },
      // orders (tableId=2)
      { tableId: 2, projectId: 1, symbolicId: "C6",  columnName: "id",           dataType: "integer",      description: "Primary key",                    isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "1",          maxValue: "312000"      },
      { tableId: 2, projectId: 1, symbolicId: "C7",  columnName: "user_id",      dataType: "integer",      description: "FK to users.id",                 isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: null,        maxValue: null          },
      { tableId: 2, projectId: 1, symbolicId: "C8",  columnName: "status",       dataType: "varchar(30)",  description: "Order lifecycle status",         isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["pending","processing","shipped","delivered","cancelled","refunded"], minValue: null, maxValue: null },
      { tableId: 2, projectId: 1, symbolicId: "C9",  columnName: "total_amount", dataType: "numeric(10,2)", description: "Total order value in USD",       isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "0.99",       maxValue: "9999.99"     },
      { tableId: 2, projectId: 1, symbolicId: "C10", columnName: "created_at",   dataType: "timestamp",    description: "Order placement date",           isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "2020-01-01", maxValue: "2026-03-01" },
      // products (tableId=4)
      { tableId: 4, projectId: 1, symbolicId: "C11", columnName: "id",        dataType: "integer",        description: "Primary key",                    isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "1",     maxValue: "15400"    },
      { tableId: 4, projectId: 1, symbolicId: "C12", columnName: "name",      dataType: "varchar(255)",   description: "Product display name",           isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: null,   maxValue: null       },
      { tableId: 4, projectId: 1, symbolicId: "C13", columnName: "price",     dataType: "numeric(10,2)",  description: "Retail price in USD",            isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "0.49",  maxValue: "2499.00"  },
      { tableId: 4, projectId: 1, symbolicId: "C14", columnName: "stock_qty", dataType: "integer",        description: "Available inventory quantity",   isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "0",     maxValue: "5000"     },
      { tableId: 4, projectId: 1, symbolicId: "C15", columnName: "is_active", dataType: "boolean",        description: "Whether product is live in catalog", isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["true","false"], minValue: null, maxValue: null },
    ];
    p1Cols.forEach((c, i) => { const id = i + 1; this.columns.set(id, { ...c, id }); });

    // P1 relationships — use column IDs 1-15 as above
    const p1Rels: Omit<DbRelationship, "id">[] = [
      { projectId: 1, fromTableId: 2, fromColumnId: 7,  toTableId: 1, toColumnId: 1, label: "Customer Purchase History", isEnabled: true },
      { projectId: 1, fromTableId: 3, fromColumnId: 7,  toTableId: 2, toColumnId: 6, label: "Order Line Items",          isEnabled: true },
      { projectId: 1, fromTableId: 6, fromColumnId: 7,  toTableId: 2, toColumnId: 6, label: "Payment for Order",         isEnabled: true },
    ];
    p1Rels.forEach((r, i) => { const id = i + 1; this.relationships.set(id, { ...r, id }); });

    // P1 query logs
    const p1Logs: Omit<QueryLog, "id">[] = [
      { projectId: 1, queryJson: { entity: "T1", select: ["C1","C2","C4"], where: { C4: { eq: "active" } } },    generatedSql: "SELECT id, email, status FROM users WHERE status = $1 LIMIT 50",                       status: "success", errorMessage: "",                              rowsReturned: 50, executedAt: new Date(Date.now() - 3600000) },
      { projectId: 1, queryJson: { entity: "T2", select: ["C6","C8","C9"], where: { C8: { eq: "pending" } } },   generatedSql: "SELECT id, status, total_amount FROM orders WHERE status = $1 LIMIT 50",               status: "success", errorMessage: "",                              rowsReturned: 23, executedAt: new Date(Date.now() - 1800000) },
      { projectId: 1, queryJson: { entity: "T1", select: ["C1","C99"] },                                          generatedSql: "",                                                                                     status: "error",   errorMessage: "Column 'C99' not found in table T1", rowsReturned: 0,  executedAt: new Date(Date.now() - 900000)  },
    ];
    p1Logs.forEach((l, i) => { const id = i + 1; this.queryLogs.set(id, { ...l, id }); });

    // ─────────────────────────────────────────────
    // PROJECT 2: Hospital Management System
    // tableIds: 9-16  |  columnIds: 16-47  |  relIds: 4-8  |  logIds: 4-7
    // ─────────────────────────────────────────────
    const project2: Project = {
      id: 2,
      name: "Hospital Management System",
      description: "Core clinical and operational database for a multi-department hospital",
      dbType: "postgresql",
      connectionString: "postgresql://hms_user:pass@db.hospital.internal:5432/hms_prod",
      status: "ready",
      tableCount: 8,
      createdAt: new Date(),
    };
    this.projects.set(2, project2);

    // tableIds 9-16
    const p2Tables: Omit<DbTable, "id">[] = [
      { projectId: 2, symbolicId: "T1", tableName: "patients",         description: "Registered patient demographics and contact information",           domain: "Clinical",     isHidden: false, isCore: true,  rowCount: 92400  },
      { projectId: 2, symbolicId: "T2", tableName: "doctors",          description: "Physician profiles including specialisation and department",         domain: "Staff",        isHidden: false, isCore: true,  rowCount: 1240   },
      { projectId: 2, symbolicId: "T3", tableName: "appointments",     description: "Scheduled patient-doctor appointments with status and slot details",  domain: "Scheduling",   isHidden: false, isCore: true,  rowCount: 540000 },
      { projectId: 2, symbolicId: "T4", tableName: "medical_records",  description: "Clinical visit notes, diagnoses, and treatment plans per patient",   domain: "Clinical",     isHidden: false, isCore: true,  rowCount: 380000 },
      { projectId: 2, symbolicId: "T5", tableName: "prescriptions",    description: "Medication prescriptions issued during a visit, linked to a record",  domain: "Pharmacy",     isHidden: false, isCore: false, rowCount: 620000 },
      { projectId: 2, symbolicId: "T6", tableName: "billing",          description: "Invoice and payment records for patient visits and procedures",        domain: "Finance",      isHidden: false, isCore: false, rowCount: 410000 },
      { projectId: 2, symbolicId: "T7", tableName: "departments",      description: "Hospital department registry (cardiology, ICU, radiology, etc.)",     domain: "Operations",   isHidden: false, isCore: false, rowCount: 28     },
      { projectId: 2, symbolicId: "T8", tableName: "sys_event_log",    description: "Internal system event and security audit trail — exclude from agents", domain: "System",       isHidden: true,  isCore: false, rowCount: 8900000},
    ];
    p2Tables.forEach((t, i) => {
      const id = i + 9; // tableIds 9-16
      this.tables.set(id, { ...t, id });
    });

    // columnIds 16-47  (32 columns across 7 visible tables)
    // We'll reference tableIds by position: patients=9, doctors=10, appointments=11, medical_records=12, prescriptions=13, billing=14, departments=15, sys_event_log=16
    const p2Cols: Omit<DbColumn, "id">[] = [
      // patients (tableId=9) — 5 cols → ids 16-20
      { tableId: 9,  projectId: 2, symbolicId: "C1",  columnName: "id",            dataType: "integer",       description: "Primary key",                                  isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask",     sampleValues: [],                         minValue: "1",          maxValue: "92400"       },
      { tableId: 9,  projectId: 2, symbolicId: "C2",  columnName: "full_name",     dataType: "varchar(150)",  description: "Patient full legal name",                      isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: true,  isHidden: false, piiMaskStrategy: "mask",     sampleValues: [],                         minValue: null,         maxValue: null          },
      { tableId: 9,  projectId: 2, symbolicId: "C3",  columnName: "date_of_birth", dataType: "date",          description: "Patient date of birth",                        isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: true,  isHidden: false, piiMaskStrategy: "generalize", sampleValues: [],                       minValue: "1930-01-01", maxValue: "2025-12-31"  },
      { tableId: 9,  projectId: 2, symbolicId: "C4",  columnName: "blood_type",    dataType: "varchar(5)",    description: "ABO blood group classification",               isPrimaryKey: false, isForeignKey: false, isNullable: true,  isPii: false, isHidden: false, piiMaskStrategy: "mask",     sampleValues: ["A+","A-","B+","O+","AB-"], minValue: null,        maxValue: null          },
      { tableId: 9,  projectId: 2, symbolicId: "C5",  columnName: "phone",         dataType: "varchar(20)",   description: "Primary contact phone number",                 isPrimaryKey: false, isForeignKey: false, isNullable: true,  isPii: true,  isHidden: false, piiMaskStrategy: "mask",     sampleValues: [],                         minValue: null,         maxValue: null          },

      // doctors (tableId=10) — 5 cols → ids 21-25
      { tableId: 10, projectId: 2, symbolicId: "C1",  columnName: "id",              dataType: "integer",     description: "Primary key",                                  isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                              minValue: "1",    maxValue: "1240"  },
      { tableId: 10, projectId: 2, symbolicId: "C2",  columnName: "full_name",       dataType: "varchar(150)",description: "Doctor full name and title",                   isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: true,  isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                              minValue: null,   maxValue: null    },
      { tableId: 10, projectId: 2, symbolicId: "C3",  columnName: "specialisation",  dataType: "varchar(100)",description: "Medical specialisation (e.g. Cardiology)",    isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["Cardiology","Neurology","Orthopaedics","Oncology","General Surgery"], minValue: null, maxValue: null },
      { tableId: 10, projectId: 2, symbolicId: "C4",  columnName: "department_id",   dataType: "integer",     description: "FK to departments.id",                         isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                              minValue: null,   maxValue: null    },
      { tableId: 10, projectId: 2, symbolicId: "C5",  columnName: "license_number",  dataType: "varchar(50)", description: "Medical council license identifier",           isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: true,  isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                              minValue: null,   maxValue: null    },

      // appointments (tableId=11) — 5 cols → ids 26-30
      { tableId: 11, projectId: 2, symbolicId: "C1",  columnName: "id",           dataType: "integer",     description: "Primary key",                                    isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                         minValue: "1",          maxValue: "540000"     },
      { tableId: 11, projectId: 2, symbolicId: "C2",  columnName: "patient_id",   dataType: "integer",     description: "FK to patients.id",                              isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                         minValue: null,         maxValue: null         },
      { tableId: 11, projectId: 2, symbolicId: "C3",  columnName: "doctor_id",    dataType: "integer",     description: "FK to doctors.id",                               isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                         minValue: null,         maxValue: null         },
      { tableId: 11, projectId: 2, symbolicId: "C4",  columnName: "scheduled_at", dataType: "timestamp",   description: "Date and time the appointment is scheduled",     isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                         minValue: "2020-01-01", maxValue: "2027-12-31" },
      { tableId: 11, projectId: 2, symbolicId: "C5",  columnName: "status",       dataType: "varchar(20)", description: "Appointment lifecycle status",                   isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["scheduled","confirmed","completed","cancelled","no_show"], minValue: null,         maxValue: null         },

      // medical_records (tableId=12) — 5 cols → ids 31-35
      { tableId: 12, projectId: 2, symbolicId: "C1",  columnName: "id",             dataType: "integer",    description: "Primary key",                                   isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],         minValue: "1",          maxValue: "380000"     },
      { tableId: 12, projectId: 2, symbolicId: "C2",  columnName: "patient_id",     dataType: "integer",    description: "FK to patients.id",                             isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],         minValue: null,         maxValue: null         },
      { tableId: 12, projectId: 2, symbolicId: "C3",  columnName: "doctor_id",      dataType: "integer",    description: "FK to doctors.id who authored the record",      isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],         minValue: null,         maxValue: null         },
      { tableId: 12, projectId: 2, symbolicId: "C4",  columnName: "diagnosis_code", dataType: "varchar(20)","description": "ICD-10 diagnosis code",                       isPrimaryKey: false, isForeignKey: false, isNullable: true,  isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["I21","J45","M54","E11","F32"], minValue: null, maxValue: null },
      { tableId: 12, projectId: 2, symbolicId: "C5",  columnName: "visit_date",     dataType: "date",       description: "Date of the clinical visit",                    isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],         minValue: "2015-01-01", maxValue: "2026-03-01" },

      // prescriptions (tableId=13) — 5 cols → ids 36-40
      { tableId: 13, projectId: 2, symbolicId: "C1",  columnName: "id",            dataType: "integer",     description: "Primary key",                                   isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                        minValue: "1",    maxValue: "620000" },
      { tableId: 13, projectId: 2, symbolicId: "C2",  columnName: "record_id",     dataType: "integer",     description: "FK to medical_records.id",                      isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                        minValue: null,   maxValue: null     },
      { tableId: 13, projectId: 2, symbolicId: "C3",  columnName: "drug_name",     dataType: "varchar(200)","description": "Generic or brand name of the prescribed drug", isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["Metformin","Atorvastatin","Amoxicillin","Omeprazole"], minValue: null, maxValue: null },
      { tableId: 13, projectId: 2, symbolicId: "C4",  columnName: "dosage",        dataType: "varchar(50)", description: "Prescribed dose and frequency (e.g. 500mg twice daily)", isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["500mg OD","20mg BD","250mg TDS"], minValue: null, maxValue: null },
      { tableId: 13, projectId: 2, symbolicId: "C5",  columnName: "duration_days", dataType: "integer",     description: "Number of days for which the prescription is valid", isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [], minValue: "1", maxValue: "365" },

      // billing (tableId=14) — 5 cols → ids 41-45
      { tableId: 14, projectId: 2, symbolicId: "C1",  columnName: "id",             dataType: "integer",      description: "Primary key",                                  isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                         minValue: "1",     maxValue: "410000" },
      { tableId: 14, projectId: 2, symbolicId: "C2",  columnName: "patient_id",     dataType: "integer",      description: "FK to patients.id",                            isPrimaryKey: false, isForeignKey: true,  isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                         minValue: null,    maxValue: null     },
      { tableId: 14, projectId: 2, symbolicId: "C3",  columnName: "amount_due",     dataType: "numeric(10,2)","description": "Total invoice amount in USD",                isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                         minValue: "0.00",  maxValue: "75000"  },
      { tableId: 14, projectId: 2, symbolicId: "C4",  columnName: "payment_status", dataType: "varchar(20)",  description: "Billing payment status",                       isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["unpaid","partial","paid","waived","insured"], minValue: null, maxValue: null },
      { tableId: 14, projectId: 2, symbolicId: "C5",  columnName: "issued_at",      dataType: "timestamp",    description: "Invoice generation timestamp",                 isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                         minValue: "2015-01-01", maxValue: "2026-03-01" },

      // departments (tableId=15) — 4 cols → ids 46-49
      { tableId: 15, projectId: 2, symbolicId: "C1",  columnName: "id",         dataType: "integer",     description: "Primary key",                                       isPrimaryKey: true,  isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                              minValue: "1",  maxValue: "28"  },
      { tableId: 15, projectId: 2, symbolicId: "C2",  columnName: "name",       dataType: "varchar(100)","description": "Department name (e.g. Cardiology, Radiology)",    isPrimaryKey: false, isForeignKey: false, isNullable: false, isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: ["Cardiology","Neurology","ICU","Radiology","General Surgery"], minValue: null, maxValue: null },
      { tableId: 15, projectId: 2, symbolicId: "C3",  columnName: "floor",      dataType: "integer",     description: "Building floor where the department is located",    isPrimaryKey: false, isForeignKey: false, isNullable: true,  isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                              minValue: "1",  maxValue: "12"  },
      { tableId: 15, projectId: 2, symbolicId: "C4",  columnName: "head_doctor_id", dataType: "integer", description: "FK to doctors.id — department head physician",       isPrimaryKey: false, isForeignKey: true,  isNullable: true,  isPii: false, isHidden: false, piiMaskStrategy: "mask", sampleValues: [],                                                              minValue: null, maxValue: null  },
    ];
    p2Cols.forEach((c, i) => {
      const id = i + 16; // columnIds 16-50
      this.columns.set(id, { ...c, id });
    });

    // P2 relationships — ids 4-8
    // Note: fromColumnId/toColumnId are the GLOBAL column IDs (16-50)
    // patients.id = 16 (C1 of tableId 9)
    // doctors.id  = 21 (C1 of tableId 10)
    // doctors.department_id = 24 (C4 of tableId 10)
    // appointments.patient_id = 27 (C2 of tableId 11)
    // appointments.doctor_id  = 28 (C3 of tableId 11)
    // medical_records.patient_id = 32 (C2 of tableId 12)
    // medical_records.doctor_id  = 33 (C3 of tableId 12)
    // prescriptions.record_id = 37 (C2 of tableId 13)
    // billing.patient_id = 42 (C2 of tableId 14)
    // departments.id = 46 (C1 of tableId 15)
    // departments.head_doctor_id = 49 (C4 of tableId 15)
    const p2Rels: Omit<DbRelationship, "id">[] = [
      { projectId: 2, fromTableId: 11, fromColumnId: 27, toTableId: 9,  toColumnId: 16, label: "Patient Appointment",          isEnabled: true },
      { projectId: 2, fromTableId: 11, fromColumnId: 28, toTableId: 10, toColumnId: 21, label: "Doctor Appointment",           isEnabled: true },
      { projectId: 2, fromTableId: 12, fromColumnId: 32, toTableId: 9,  toColumnId: 16, label: "Patient Medical Record",       isEnabled: true },
      { projectId: 2, fromTableId: 12, fromColumnId: 33, toTableId: 10, toColumnId: 21, label: "Attending Physician Record",   isEnabled: true },
      { projectId: 2, fromTableId: 13, fromColumnId: 37, toTableId: 12, toColumnId: 31, label: "Prescription for Visit",      isEnabled: true },
      { projectId: 2, fromTableId: 14, fromColumnId: 42, toTableId: 9,  toColumnId: 16, label: "Patient Billing Invoice",      isEnabled: true },
      { projectId: 2, fromTableId: 10, fromColumnId: 24, toTableId: 15, toColumnId: 46, label: "Doctor Department Assignment", isEnabled: true },
    ];
    p2Rels.forEach((r, i) => {
      const id = i + 4; // relIds 4-10
      this.relationships.set(id, { ...r, id });
    });

    // P2 query logs — ids 4-7
    const p2Logs: Omit<QueryLog, "id">[] = [
      { projectId: 2, queryJson: { entity: "T1", select: ["C1","C2","C4"], where: { C4: { eq: "O+" } } },          generatedSql: "SELECT id, full_name, blood_type FROM patients WHERE blood_type = $1 LIMIT 50",         status: "success", errorMessage: "",                                         rowsReturned: 50, executedAt: new Date(Date.now() - 7200000)  },
      { projectId: 2, queryJson: { entity: "T3", select: ["C1","C2","C3","C5"], where: { C5: { eq: "scheduled" } } }, generatedSql: "SELECT id, patient_id, doctor_id, status FROM appointments WHERE status = $1 LIMIT 50", status: "success", errorMessage: "",                                         rowsReturned: 38, executedAt: new Date(Date.now() - 3600000)  },
      { projectId: 2, queryJson: { entity: "T6", select: ["C1","C2","C4"], where: { C4: { eq: "unpaid" } } },       generatedSql: "SELECT id, patient_id, payment_status FROM billing WHERE payment_status = $1 LIMIT 50", status: "success", errorMessage: "",                                         rowsReturned: 50, executedAt: new Date(Date.now() - 1800000)  },
      { projectId: 2, queryJson: { entity: "T2", select: ["C1","C99"] },                                             generatedSql: "",                                                                                      status: "error",   errorMessage: "Column 'C99' not found in table T2 (doctors)", rowsReturned: 0,  executedAt: new Date(Date.now() - 600000)   },
    ];
    p2Logs.forEach((l, i) => {
      const id = i + 4; // logIds 4-7
      this.queryLogs.set(id, { ...l, id });
    });

    // Set nextId counters past all seeded data
    this.nextId.project      = 3;
    this.nextId.table        = 17;  // 8 + 8 + 1
    this.nextId.column       = 51;  // 15 + 35 + 1
    this.nextId.relationship = 11;  // 3 + 7 + 1
    this.nextId.log          = 8;   // 3 + 4 + 1
  }

  // Projects
  async getProjects() { return Array.from(this.projects.values()); }
  async getProject(id: number) { return this.projects.get(id); }
  async createProject(data: InsertProject): Promise<Project> {
    const id = this.nextId.project++;
    const p: Project = { ...data, id, createdAt: new Date(), status: data.status ?? "draft", description: data.description ?? "", dbType: data.dbType ?? "postgresql", connectionString: data.connectionString ?? "", tableCount: data.tableCount ?? 0 };
    this.projects.set(id, p);
    return p;
  }
  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error("Project not found");
    const updated = { ...existing, ...data };
    this.projects.set(id, updated);
    return updated;
  }
  async deleteProject(id: number) {
    this.projects.delete(id);
    Array.from(this.tables.entries()).filter(([, t]) => t.projectId === id).forEach(([k]) => this.tables.delete(k));
    Array.from(this.columns.entries()).filter(([, c]) => c.projectId === id).forEach(([k]) => this.columns.delete(k));
    Array.from(this.relationships.entries()).filter(([, r]) => r.projectId === id).forEach(([k]) => this.relationships.delete(k));
  }

  // Tables
  async getTablesByProject(projectId: number) { return Array.from(this.tables.values()).filter(t => t.projectId === projectId); }
  async getTable(id: number) { return this.tables.get(id); }
  async createTable(data: InsertDbTable): Promise<DbTable> {
    const id = this.nextId.table++;
    const t: DbTable = { id, ...data, description: data.description ?? "", domain: data.domain ?? "General", isHidden: data.isHidden ?? false, isCore: data.isCore ?? false, rowCount: data.rowCount ?? 0 };
    this.tables.set(id, t);
    return t;
  }
  async updateTable(id: number, data: Partial<InsertDbTable>): Promise<DbTable> {
    const existing = this.tables.get(id);
    if (!existing) throw new Error("Table not found");
    const updated = { ...existing, ...data };
    this.tables.set(id, updated);
    return updated;
  }
  async deleteTablesByProject(projectId: number) {
    Array.from(this.tables.entries()).filter(([, t]) => t.projectId === projectId).forEach(([k]) => this.tables.delete(k));
  }

  // Columns
  async getColumnsByProject(projectId: number) { return Array.from(this.columns.values()).filter(c => c.projectId === projectId); }
  async getColumnsByTable(tableId: number) { return Array.from(this.columns.values()).filter(c => c.tableId === tableId); }
  async createColumn(data: InsertDbColumn): Promise<DbColumn> {
    const id = this.nextId.column++;
    const c: DbColumn = { id, ...data, description: data.description ?? "", isPrimaryKey: data.isPrimaryKey ?? false, isForeignKey: data.isForeignKey ?? false, isNullable: data.isNullable ?? true, isPii: data.isPii ?? false, isHidden: data.isHidden ?? false, piiMaskStrategy: data.piiMaskStrategy ?? "mask", sampleValues: data.sampleValues ?? [], minValue: data.minValue ?? null, maxValue: data.maxValue ?? null };
    this.columns.set(id, c);
    return c;
  }
  async updateColumn(id: number, data: Partial<InsertDbColumn>): Promise<DbColumn> {
    const existing = this.columns.get(id);
    if (!existing) throw new Error("Column not found");
    const updated = { ...existing, ...data };
    this.columns.set(id, updated);
    return updated;
  }

  // Relationships
  async getRelationshipsByProject(projectId: number) { return Array.from(this.relationships.values()).filter(r => r.projectId === projectId); }
  async createRelationship(data: InsertDbRelationship): Promise<DbRelationship> {
    const id = this.nextId.relationship++;
    const r: DbRelationship = { id, ...data, label: data.label ?? "", isEnabled: data.isEnabled ?? true };
    this.relationships.set(id, r);
    return r;
  }
  async updateRelationship(id: number, data: Partial<InsertDbRelationship>): Promise<DbRelationship> {
    const existing = this.relationships.get(id);
    if (!existing) throw new Error("Relationship not found");
    const updated = { ...existing, ...data };
    this.relationships.set(id, updated);
    return updated;
  }
  async deleteRelationshipsByProject(projectId: number) {
    Array.from(this.relationships.entries()).filter(([, r]) => r.projectId === projectId).forEach(([k]) => this.relationships.delete(k));
  }

  // Query Logs
  async getQueryLogs(projectId: number) {
    return Array.from(this.queryLogs.values()).filter(l => l.projectId === projectId).sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }
  async createQueryLog(data: InsertQueryLog): Promise<QueryLog> {
    const id = this.nextId.log++;
    const l: QueryLog = { id, ...data, generatedSql: data.generatedSql ?? "", status: data.status ?? "pending", errorMessage: data.errorMessage ?? "", rowsReturned: data.rowsReturned ?? 0, executedAt: new Date() };
    this.queryLogs.set(id, l);
    return l;
  }

  // Manifest generation
  async getManifest(projectId: number): Promise<object> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error("Project not found");
    const tables = await this.getTablesByProject(projectId);
    const columns = await this.getColumnsByProject(projectId);
    const relationships = await this.getRelationshipsByProject(projectId);

    const tableMap: Record<string, object> = {};
    for (const t of tables.filter(t => !t.isHidden)) {
      const tColumns = columns.filter(c => c.tableId === t.id && !c.isHidden);
      tableMap[t.symbolicId] = {
        tableName: t.tableName,
        description: t.description,
        domain: t.domain,
        isCore: t.isCore,
        rowCount: t.rowCount,
        columns: Object.fromEntries(tColumns.map(c => [c.symbolicId, {
          columnName: c.columnName,
          dataType: c.dataType,
          description: c.description,
          isPrimaryKey: c.isPrimaryKey,
          isForeignKey: c.isForeignKey,
          isPii: c.isPii,
          piiMaskStrategy: c.isPii ? c.piiMaskStrategy : undefined,
          sampleValues: c.sampleValues,
          range: (c.minValue || c.maxValue) ? { min: c.minValue, max: c.maxValue } : undefined,
        }])),
      };
    }

    return {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      project: { name: project.name, description: project.description, dbType: project.dbType },
      tables: tableMap,
      relationships: relationships.filter(r => r.isEnabled).map(r => {
        const fromTable = tables.find(t => t.id === r.fromTableId);
        const toTable   = tables.find(t => t.id === r.toTableId);
        const fromCol   = columns.find(c => c.id === r.fromColumnId);
        const toCol     = columns.find(c => c.id === r.toColumnId);
        return {
          label: r.label,
          from: `${fromTable?.symbolicId}.${fromCol?.symbolicId}`,
          to:   `${toTable?.symbolicId}.${toCol?.symbolicId}`,
        };
      }),
      queryConfig: { defaultLimit: 50, readOnly: true },
    };
  }
}

export const storage = new MemStorage();
