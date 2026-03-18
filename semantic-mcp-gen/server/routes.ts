import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertDbTableSchema, insertDbColumnSchema, insertDbRelationshipSchema } from "@shared/schema";
import { z } from "zod";
import https from "https";
import http from "http";

// ─── LLM helper ─────────────────────────────────────────────────────────────
type LLMProvider = "openai" | "anthropic";

async function callLLM(provider: LLMProvider, apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let hostname: string, path: string, body: object, headers: Record<string, string>;

    if (provider === "openai") {
      hostname = "api.openai.com";
      path = "/v1/chat/completions";
      body = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      };
      headers = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
    } else {
      hostname = "api.anthropic.com";
      path = "/v1/messages";
      body = {
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      };
      headers = { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
    }

    const payload = JSON.stringify(body);
    const req = https.request({ hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(payload) } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed.error?.message || parsed.error?.type || `HTTP ${res.statusCode}`));
            return;
          }
          const text = provider === "openai"
            ? parsed.choices?.[0]?.message?.content
            : parsed.content?.[0]?.text;
          if (!text) reject(new Error("Empty response from LLM"));
          else resolve(text);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// Semantic Query schema
const semanticQuerySchema = z.object({
  entity: z.string(),
  select: z.array(z.string()),
  where: z.record(z.union([
    z.object({ eq: z.union([z.string(), z.number()]) }),
    z.object({ neq: z.union([z.string(), z.number()]) }),
    z.object({ gt: z.union([z.string(), z.number()]) }),
    z.object({ lt: z.union([z.string(), z.number()]) }),
    z.object({ like: z.string() }),
    z.object({ in: z.array(z.union([z.string(), z.number()])) }),
  ])).optional(),
  limit: z.number().min(1).max(200).optional().default(50),
  orderBy: z.object({ column: z.string(), direction: z.enum(["asc", "desc"]) }).optional(),
});

function buildSqlFromSemanticQuery(query: z.infer<typeof semanticQuerySchema>, tableName: string, colMap: Record<string, string>): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const selectCols = query.select.map(sym => colMap[sym] || sym).join(", ");
  let sql = `SELECT ${selectCols} FROM ${tableName}`;

  if (query.where && Object.keys(query.where).length > 0) {
    const conditions: string[] = [];
    for (const [sym, cond] of Object.entries(query.where)) {
      const colName = colMap[sym] || sym;
      if ("eq" in cond) { params.push(cond.eq); conditions.push(`${colName} = $${params.length}`); }
      else if ("neq" in cond) { params.push(cond.neq); conditions.push(`${colName} != $${params.length}`); }
      else if ("gt" in cond) { params.push(cond.gt); conditions.push(`${colName} > $${params.length}`); }
      else if ("lt" in cond) { params.push(cond.lt); conditions.push(`${colName} < $${params.length}`); }
      else if ("like" in cond) { params.push(cond.like); conditions.push(`${colName} LIKE $${params.length}`); }
      else if ("in" in cond) {
        const placeholders = cond.in.map((v: unknown, i: number) => { params.push(v); return `$${params.length}`; }).join(", ");
        conditions.push(`${colName} IN (${placeholders})`);
      }
    }
    if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  if (query.orderBy) {
    const colName = colMap[query.orderBy.column] || query.orderBy.column;
    sql += ` ORDER BY ${colName} ${query.orderBy.direction.toUpperCase()}`;
  }

  sql += ` LIMIT ${query.limit ?? 50}`;
  return { sql, params };
}

export function registerRoutes(httpServer: Server, app: Express) {
  // ─── Projects ───────────────────────────────────────────────────────────
  app.get("/api/projects", async (_req, res) => {
    try { res.json(await storage.getProjects()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const p = await storage.getProject(Number(req.params.id));
      if (!p) return res.status(404).json({ error: "Not found" });
      res.json(p);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      res.json(await storage.createProject(data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const data = insertProjectSchema.partial().parse(req.body);
      res.json(await storage.updateProject(Number(req.params.id), data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(Number(req.params.id));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Introspection (simulate) ────────────────────────────────────────────
  app.post("/api/projects/:id/introspect", async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      // Simulate introspection - in real impl this would connect to DB
      await storage.updateProject(projectId, { status: "introspecting" });
      // Simulate delay then set ready
      setTimeout(async () => {
        await storage.updateProject(projectId, { status: "enriching", tableCount: 8 });
      }, 1500);
      res.json({ message: "Introspection started", status: "introspecting" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Tables ──────────────────────────────────────────────────────────────
  app.get("/api/projects/:id/tables", async (req, res) => {
    try { res.json(await storage.getTablesByProject(Number(req.params.id))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/tables/:id", async (req, res) => {
    try {
      const data = insertDbTableSchema.partial().parse(req.body);
      res.json(await storage.updateTable(Number(req.params.id), data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── Columns ─────────────────────────────────────────────────────────────
  app.get("/api/tables/:id/columns", async (req, res) => {
    try { res.json(await storage.getColumnsByTable(Number(req.params.id))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/projects/:id/columns", async (req, res) => {
    try { res.json(await storage.getColumnsByProject(Number(req.params.id))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/columns/:id", async (req, res) => {
    try {
      const data = insertDbColumnSchema.partial().parse(req.body);
      res.json(await storage.updateColumn(Number(req.params.id), data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── Relationships ────────────────────────────────────────────────────────
  app.get("/api/projects/:id/relationships", async (req, res) => {
    try { res.json(await storage.getRelationshipsByProject(Number(req.params.id))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/projects/:id/relationships", async (req, res) => {
    try {
      const data = insertDbRelationshipSchema.parse({ ...req.body, projectId: Number(req.params.id) });
      res.json(await storage.createRelationship(data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/relationships/:id", async (req, res) => {
    try {
      const data = insertDbRelationshipSchema.partial().parse(req.body);
      res.json(await storage.updateRelationship(Number(req.params.id), data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── Query Engine (Semantic Firewall) ────────────────────────────────────
  app.post("/api/projects/:id/query", async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const query = semanticQuerySchema.parse(req.body);

      // Get tables and columns for validation
      const tables = await storage.getTablesByProject(projectId);
      const allColumns = await storage.getColumnsByProject(projectId);

      // Validate entity
      const table = tables.find(t => t.symbolicId === query.entity && !t.isHidden);
      if (!table) {
        const log = await storage.createQueryLog({
          projectId,
          queryJson: query,
          generatedSql: "",
          status: "error",
          errorMessage: `Entity '${query.entity}' not found or is hidden`,
          rowsReturned: 0,
        });
        return res.status(400).json({ error: log.errorMessage, log });
      }

      // Get columns for this table
      const tableColumns = allColumns.filter(c => c.tableId === table.id);

      // Validate select columns
      for (const sym of query.select) {
        const col = tableColumns.find(c => c.symbolicId === sym);
        if (!col) {
          const log = await storage.createQueryLog({
            projectId, queryJson: query, generatedSql: "", status: "error",
            errorMessage: `Column '${sym}' not found in table ${query.entity}`, rowsReturned: 0,
          });
          return res.status(400).json({ error: log.errorMessage, log });
        }
        if (col.isHidden) {
          const log = await storage.createQueryLog({
            projectId, queryJson: query, generatedSql: "", status: "error",
            errorMessage: `Column '${sym}' is hidden from agent access`, rowsReturned: 0,
          });
          return res.status(400).json({ error: log.errorMessage, log });
        }
      }

      // Build column map: symbolic -> real name
      const colMap: Record<string, string> = {};
      tableColumns.forEach(c => { colMap[c.symbolicId] = c.columnName; });

      // Build SQL
      const { sql, params } = buildSqlFromSemanticQuery(query, table.tableName, colMap);

      // Simulate query execution - in real impl would run against DB
      // Apply PII masking to column descriptions
      const piiColumns = tableColumns.filter(c => c.isPii && query.select.includes(c.symbolicId));
      const mockRows = Array.from({ length: Math.min(query.limit ?? 50, 5) }, (_, i) => {
        const row: Record<string, unknown> = {};
        for (const sym of query.select) {
          const col = tableColumns.find(c => c.symbolicId === sym);
          if (!col) continue;
          if (col.isPii && col.piiMaskStrategy === "mask") {
            if (col.dataType.includes("varchar") || col.dataType === "text") {
              row[col.columnName] = col.columnName.includes("email") ? `u***@example.com` : `***masked***`;
            } else {
              row[col.columnName] = "***";
            }
          } else if (col.sampleValues && col.sampleValues.length > 0) {
            row[col.columnName] = col.sampleValues[i % col.sampleValues.length];
          } else if (col.dataType.includes("int")) {
            row[col.columnName] = i + 1;
          } else if (col.dataType.includes("numeric")) {
            row[col.columnName] = (Math.random() * 100).toFixed(2);
          } else if (col.dataType === "boolean") {
            row[col.columnName] = i % 2 === 0;
          } else if (col.dataType === "timestamp") {
            row[col.columnName] = new Date(Date.now() - i * 86400000).toISOString();
          } else {
            row[col.columnName] = `sample_${col.columnName}_${i + 1}`;
          }
        }
        return row;
      });

      const log = await storage.createQueryLog({
        projectId, queryJson: query, generatedSql: sql, status: "success",
        errorMessage: "", rowsReturned: mockRows.length,
      });

      res.json({
        sql,
        rows: mockRows,
        rowsReturned: mockRows.length,
        piiMasked: piiColumns.length > 0,
        piiColumns: piiColumns.map(c => c.symbolicId),
        log,
        note: "Query executed against simulated data. Connect a real DB to run live queries.",
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── Query Logs ───────────────────────────────────────────────────────────
  app.get("/api/projects/:id/logs", async (req, res) => {
    try { res.json(await storage.getQueryLogs(Number(req.params.id))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Manifest ─────────────────────────────────────────────────────────────
  app.get("/api/projects/:id/manifest", async (req, res) => {
    try {
      const manifest = await storage.getManifest(Number(req.params.id));
      res.json(manifest);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── AI Agent: Auto-Enrich Schema ────────────────────────────────────────
  const enrichSchema = z.object({
    provider: z.enum(["openai", "anthropic"]),
    apiKey: z.string().min(10),
    tableIds: z.array(z.number()).optional(), // if omitted, enrich all
  });

  app.post("/api/projects/:id/agent/enrich", async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const { provider, apiKey, tableIds } = enrichSchema.parse(req.body);

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const allTables = await storage.getTablesByProject(projectId);
      const allColumns = await storage.getColumnsByProject(projectId);

      // Filter to requested tables (or all)
      const targetTables = tableIds?.length
        ? allTables.filter(t => tableIds.includes(t.id))
        : allTables;

      // Build a compact schema snapshot for the LLM
      const schemaSnapshot = targetTables.map(t => ({
        tableId: t.id,
        symbolicId: t.symbolicId,
        tableName: t.tableName,
        currentDescription: t.description,
        currentDomain: t.domain,
        columns: allColumns.filter(c => c.tableId === t.id).map(c => ({
          columnId: c.id,
          symbolicId: c.symbolicId,
          columnName: c.columnName,
          dataType: c.dataType,
          currentDescription: c.description,
          isPrimaryKey: c.isPrimaryKey,
          isForeignKey: c.isForeignKey,
          sampleValues: c.sampleValues?.slice(0, 5) ?? [],
        })),
      }));

      const systemPrompt = `You are a senior data engineer and database documentation expert.
Your job is to analyze raw database table and column names and produce:
1. Clear, plain-English business descriptions (1-2 sentences max) for tables AND columns.
2. A domain classification for each table (choose one: Users, Sales, Catalog, Finance, System, Operations, Analytics, or General).
3. PII detection: flag columns containing personal data (name, email, phone, address, SSN, DOB, IP address, etc.) with isPii: true.

Be concise. Write descriptions that a product manager could read and understand instantly.
DO NOT mention technical implementation details unless essential.
Return ONLY valid JSON matching the exact structure in the user message.`;

      const userMessage = `Analyze this database schema for project "${project.name}" (${project.dbType}).
Context: ${project.description || "No additional context provided."}

Schema to enrich:
${JSON.stringify(schemaSnapshot, null, 2)}

Return a JSON object with this EXACT structure:
{
  "tables": [
    {
      "tableId": <number>,
      "description": "<clear business description>",
      "domain": "<domain>"
    }
  ],
  "columns": [
    {
      "columnId": <number>,
      "description": "<clear business description>",
      "isPii": <boolean>
    }
  ]
}

IMPORTANT: Return the EXACT same tableId and columnId values from the input. Return ALL tables and ALL columns.`;

      // For Anthropic, append JSON instruction since it doesn't have response_format
      const anthropicUserMessage = userMessage + "\n\nRespond with ONLY the JSON object, no markdown, no explanation.";
      const finalUserMessage = provider === "anthropic" ? anthropicUserMessage : userMessage;

      const llmResponse = await callLLM(provider, apiKey, systemPrompt, finalUserMessage);

      // Parse LLM response - extract JSON if wrapped in markdown
      let enrichments: { tables: Array<{ tableId: number; description: string; domain: string }>; columns: Array<{ columnId: number; description: string; isPii: boolean }> };
      try {
        // Strip markdown code fences if present
        const cleaned = llmResponse.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
        enrichments = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "LLM returned invalid JSON. Try again.", raw: llmResponse.slice(0, 300) });
      }

      // Apply enrichments
      const updatedTables: number[] = [];
      const updatedColumns: number[] = [];

      for (const t of (enrichments.tables || [])) {
        try {
          await storage.updateTable(t.tableId, { description: t.description, domain: t.domain });
          updatedTables.push(t.tableId);
        } catch { /* skip if table not found */ }
      }

      for (const c of (enrichments.columns || [])) {
        try {
          await storage.updateColumn(c.columnId, { description: c.description, isPii: c.isPii });
          updatedColumns.push(c.columnId);
        } catch { /* skip if column not found */ }
      }

      res.json({
        ok: true,
        updatedTables: updatedTables.length,
        updatedColumns: updatedColumns.length,
        message: `Enriched ${updatedTables.length} tables and ${updatedColumns.length} columns successfully.`,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
