export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
      const payload = await request.json();
      const { action, data } = payload;
      let responsePayload = { success: false, message: "Unknown action" };

      switch (action) {
        // --- AUTH & ACCOUNT ---
        case 'login': responsePayload = await handleLogin(env.DB, data); break;
        case 'updateCredentials': responsePayload = await handleUpdateCredentials(env.DB, data); break;
        case 'updateProfileDetails': responsePayload = await handleUpdateProfile(env.DB, env, data); break;
        case 'updateAccountPassword': responsePayload = await handleUpdatePassword(env.DB, data); break;
        case 'uploadSignature': responsePayload = await handleUploadSignature(env.DB, env, data); break;
        case 'uploadLogo': responsePayload = await handleUploadLogo(env.DB, env, data); break;
        case 'uploadAvatar': responsePayload = await handleUploadAvatar(env.DB, env, data); break;

        // --- DASHBOARDS & FIXED COSTS ---
        case 'getDashboardData': responsePayload = await handleGetDashboardData(env.DB, data); break;
        case 'addFixedCost': responsePayload = await handleAddFixedCost(env.DB, data); break;
        case 'ProfessionalFinanceDashboard': responsePayload = await handleProfessionalFinanceDashboard(env.DB, data); break;

        // --- PROJECTS & LEDGER ---
        case 'getProjectList': responsePayload = await handleGetProjects(env.DB, data); break;
        case 'createProject': responsePayload = await handleCreateProject(env.DB, data); break;
        case 'getProjectLedger': responsePayload = await handleGetProjectLedger(env.DB, data); break;
        case 'addExpense': responsePayload = await handleAddExpense(env.DB, env, data); break;
        case 'updateProjectStatus': responsePayload = await handleUpdateProjectStatus(env.DB, data); break;
        case 'toggleProjectTax': responsePayload = await handleToggleTax(env.DB, data); break;

        // --- QUOTATIONS ---
        case 'getUserQuotations': responsePayload = await handleGetUserQuotations(env.DB, data); break;
        case 'deleteQuotation': responsePayload = await handleDeleteQuotation(env.DB, data); break;
        case 'restoreQuotation': responsePayload = await handleRestoreQuotation(env.DB, data); break;
        case 'updateQuotationStatus': responsePayload = await handleUpdateQuotationStatus(env.DB, data); break;
        case 'getQuotationDetail': responsePayload = await handleGetQuotationDetail(env.DB, data); break;
        case 'processForm': responsePayload = await handleProcessForm(env.DB, data); break;
        case 'editQuotation': responsePayload = await handleEditQuotation(env.DB, data); break;

        // --- CUSTOMERS ---
        case 'getCustomers': responsePayload = await handleGetCustomers(env.DB, data); break;
        case 'saveCustomer': responsePayload = await handleSaveCustomer(env.DB, data); break;
        case 'deleteDbCustomer': responsePayload = await handleDeleteDbCustomer(env.DB, data); break;

        case 'updateThumbnail':
          if (env.GAS_URL) {
            const proj = await env.DB.prepare(`SELECT main_agent_id, co_agent_id FROM projects WHERE name = ?`).bind(data.projectName).first();
            if (!proj) { responsePayload = { success: false, message: "Project not found." }; break; }
            const isOwner = (data.callerId === proj.main_agent_id || data.callerId === proj.co_agent_id);
            if (!isOwner && data.callerRole !== 'Superuser') { responsePayload = { success: false, message: "Not authorized." }; break; }
            const gasRes = await proxyToGAS(env.GAS_URL, { action: 'uploadFile', data: { base64: data.fileData, fileName: "Thumb_" + data.projectName, subFolder: "Project Thumbnails" } });
            if (gasRes && gasRes.fileUrl) {
              await env.DB.prepare(`UPDATE projects SET thumbnail_url = ? WHERE name = ?`).bind(gasRes.fileUrl, data.projectName).run();
              responsePayload = { success: true, thumbnailUrl: gasRes.fileUrl };
            } else { responsePayload = { success: false, message: "Thumbnail upload failed at GAS." }; }
          }
          break;

        default: responsePayload = { success: false, message: "Invalid action." };
      }
      return new Response(JSON.stringify(responsePayload), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.toString() }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
  }
};

// ==========================================
// ACCOUNT & AUTH LOGIC
// ==========================================
async function handleLogin(db, data) {
  const user = await db.prepare("SELECT * FROM accounts WHERE (username = ? OR email = ? OR contact = ?) AND password = ?").bind(data.username, data.username, data.username, data.password).first();
  if (!user) return { success: false, message: "Invalid Credentials" };
  const allAgents = await db.prepare("SELECT id, username, name FROM accounts WHERE role = 'Agent'").all();

  const cfg = await db.prepare("SELECT key, value FROM app_config WHERE key IN ('logo1_url','logo2_url','fallback_thumb_url')").all();
  const cfgMap = {};
  (cfg.results || []).forEach(r => { cfgMap[r.key] = r.value; });

  return {
    success: true,
    status: (user.status === 'New' || user.status === 'FORCE_CHANGE') ? 'FORCE_CHANGE' : 'ACTIVE',
    userId: user.id,
    username: user.username,
    name: user.name || user.username,
    displayName: user.display_name || user.name || user.username,
    email: user.email,
    contact: user.contact,
    role: user.role,
    hasSignature: !!user.signature_url,
    signatureUrl: user.signature_url || null,
    avatarUrl: user.avatar_url || null,
    agents: allAgents.results.map(a => ({ id: a.id, username: a.username, name: a.name || a.username })),
    logo1Url:         cfgMap['logo1_url']          || null,
    logo2Url:         cfgMap['logo2_url']          || null,
    fallbackThumbUrl: cfgMap['fallback_thumb_url'] || null
  };
}

async function handleUpdateCredentials(db, data) {
  if (data.oldUser !== data.newUser) {
    const existing = await db.prepare("SELECT id FROM accounts WHERE username = ?").bind(data.newUser).first();
    if (existing) return { success: false, message: "Username taken." };
  }
  const result = await db.prepare("UPDATE accounts SET username = ?, password = ?, email = ?, contact = ?, status = 'Active' WHERE username = ? AND password = ?").bind(data.newUser, data.newPass, data.newEmail, data.newContact, data.oldUser, data.oldPass).run();
  if (result.meta.changes > 0) return { success: true, message: "Account setup complete! Please login." };
  return { success: false, message: "Credentials mismatch." };
}

async function handleUpdateProfile(db, env, data) {
  const user = await db.prepare("SELECT * FROM accounts WHERE id = ? AND password = ?").bind(data.userId, data.pass).first();
  if (!user) return { success: false, message: "Incorrect password." };

  if (data.newUsername && data.newUsername !== user.username) {
    const existing = await db.prepare("SELECT id FROM accounts WHERE username = ? AND id != ?").bind(data.newUsername, data.userId).first();
    if (existing) return { success: false, message: "Username already taken." };
  }

  const newUsername    = data.newUsername    || user.username;
  const newDisplayName = data.newDisplayName || user.display_name || user.name || user.username;
  const newEmail       = data.newEmail       || user.email;
  const newContact     = data.newContact     || user.contact;

  await db.prepare(
    "UPDATE accounts SET username = ?, display_name = ?, email = ?, contact = ? WHERE id = ?"
  ).bind(newUsername, newDisplayName, newEmail, newContact, data.userId).run();

  return {
    success: true,
    newUsername,
    displayName: newDisplayName,
    email: newEmail,
    contact: newContact,
    usernameChanged: newUsername !== user.username
  };
}

async function handleUpdatePassword(db, data) {
  const result = await db.prepare("UPDATE accounts SET password = ? WHERE username = ? AND password = ?").bind(data.newPass, data.user, data.oldPass).run();
  if (result.meta.changes > 0) return { success: true };
  return { success: false, message: "Incorrect current password." };
}

async function handleUploadSignature(db, env, data) {
  const user = await db.prepare("SELECT * FROM accounts WHERE username = ? AND password = ?").bind(data.user, data.pass).first();
  if (!user) return { success: false, message: "Authentication failed." };
  if (env.GAS_URL) {
    const gasRes = await proxyToGAS(env.GAS_URL, { action: 'uploadFile', data: { base64: data.image, fileName: data.user + "_Signature", subFolder: "Signatures" } });
    if (gasRes && gasRes.fileUrl) {
      await db.prepare("UPDATE accounts SET signature_url = ? WHERE username = ?").bind(gasRes.fileUrl, data.user).run();
      return { success: true };
    }
  }
  return { success: false, message: "Upload failed at GAS." };
}

async function handleUploadAvatar(db, env, data) {
  const user = await db.prepare("SELECT * FROM accounts WHERE id = ? AND password = ?").bind(data.userId, data.pass).first();
  if (!user) return { success: false, message: "Authentication failed." };
  if (!env.GAS_URL) return { success: false, message: "GAS_URL not configured." };

  const gasRes = await proxyToGAS(env.GAS_URL, {
    action: 'uploadFile',
    data: { base64: data.image, fileName: user.username + "_Avatar", subFolder: "Avatars" }
  });

  if (gasRes && gasRes.fileUrl) {
    await db.prepare("UPDATE accounts SET avatar_url = ? WHERE id = ?").bind(gasRes.fileUrl, data.userId).run();
    return { success: true, avatarUrl: gasRes.fileUrl };
  }
  return { success: false, message: "Upload failed at GAS." };
}

async function handleUploadLogo(db, env, data) {
  const user = await db.prepare("SELECT role FROM accounts WHERE username = ? AND password = ?").bind(data.user, data.pass).first();
  if (!user || user.role !== 'Superuser') return { success: false, message: "Not authorized." };

  const allowedKeys = ['logo1_url', 'logo2_url'];
  if (!allowedKeys.includes(data.key)) return { success: false, message: "Invalid config key." };
  if (!env.GAS_URL) return { success: false, message: "GAS_URL not configured." };

  const fileName = data.key === 'logo1_url' ? 'Company_Logo1' : 'Company_Logo2';
  const gasRes = await proxyToGAS(env.GAS_URL, {
    action: 'uploadFile',
    data: { base64: data.image, fileName: fileName, subFolder: "Logos" }
  });

  if (gasRes && gasRes.fileUrl) {
    await db.prepare(`
      INSERT INTO app_config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).bind(data.key, gasRes.fileUrl).run();
    return { success: true, fileUrl: gasRes.fileUrl };
  }
  return { success: false, message: "Upload failed at GAS." };
}

// ==========================================
// DASHBOARDS & FIXED COSTS
// ==========================================
async function handleGetDashboardData(db, data) {
  try {
    const { agentId, role } = data;
    let projectsRes = role === 'Superuser'
      ? await db.prepare("SELECT * FROM projects").all()
      : await db.prepare("SELECT * FROM projects WHERE main_agent_id = ? OR co_agent_id = ?").bind(agentId, agentId).all();
    let projects = projectsRes.results || [];
    const ledgerRes = await db.prepare("SELECT * FROM project_ledger").all();
    const allLedgers = ledgerRes.results || [];
    projects = projects.map(p => { p.transactions = allLedgers.filter(l => l.project_id === p.id); return p; });
    const fixedCosts = allLedgers.filter(l => l.project_id === 'GLOBAL' && l.type === 'FixedCost');
    return { success: true, data: { projects, fixedCosts } };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleAddFixedCost(db, data) {
  try {
    const globalExists = await db.prepare("SELECT id FROM projects WHERE id = 'GLOBAL'").first();
    if (!globalExists) {
      await db.prepare("INSERT INTO projects (id, name, main_agent, main_agent_id, status, created_at) VALUES ('GLOBAL', 'Global Fixed Costs', 'SYSTEM', 'SYSTEM', 'System', datetime('now'))").run();
    }
    const id = crypto.randomUUID();
    const dateStr = data.date ? `${data.date} 00:00:00` : new Date().toISOString().replace('T', ' ').substring(0, 19);
    await db.prepare(`INSERT INTO project_ledger (id, project_id, type, description, amount, agent_name, agent_id, created_at) VALUES (?, 'GLOBAL', 'FixedCost', ?, ?, ?, ?, ?)`)
      .bind(id, data.description, Number(data.amount), data.agentName, data.agentId, dateStr).run();
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

// ==========================================
// SYSTEM & PROJECT LOGIC
// ==========================================
async function handleGetProjects(db, data) {
  let query = "SELECT * FROM projects";
  let params = [];
  if (data.role !== 'Superuser') {
    query += " WHERE main_agent_id = ? OR co_agent_id = ?";
    params = [data.agentId, data.agentId];
  }
  const { results } = await db.prepare(query).bind(...params).all();
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filtered = results.filter(p => {
    if (data.recentOnly && p.status === 'Completed' && new Date(p.created_at) < thirtyDaysAgo) return false;
    return true;
  });
  return { success: true, data: filtered };
}

async function handleCreateProject(db, data) {
  const existing = await db.prepare("SELECT id FROM projects WHERE name = ?").bind(data.projectName).first();
  if (existing) return { success: false, message: "Project name already exists." };
  await db.prepare("INSERT INTO projects (id, name, main_agent, main_agent_id, co_agent, co_agent_id, status, is_taxable, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))")
    .bind(crypto.randomUUID(), data.projectName, data.mainAgent, data.mainAgentId, data.coAgent || null, data.coAgentId || null, 'In Progress').run();
  return { success: true };
}

async function handleGetProjectLedger(db, data) {
  try {
    const proj = await db.prepare("SELECT * FROM projects WHERE name = ?").bind(data.projectName).first();
    if (!proj) return { success: false, message: "Project not found" };
    const { results } = await db.prepare("SELECT * FROM project_ledger WHERE project_id = ? ORDER BY created_at ASC").bind(proj.id).all();
    return {
      success: true,
      data: {
        id: proj.id,
        name: proj.name,
        mainAgent: proj.main_agent,
        mainAgentId: proj.main_agent_id,
        coAgent: proj.co_agent,
        coAgentId: proj.co_agent_id,
        status: proj.status,
        thumbnail_url: proj.thumbnail_url,
        is_taxable: proj.is_taxable,
        transactions: results
      }
    };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleAddExpense(db, env, data) {
  try {
    let receiptUrl = null;
    if (data.image) {
      const gasRes = await proxyToGAS(env.GAS_URL, { action: 'uploadFile', data: { base64: data.image, fileName: `Receipt_${Date.now()}`, subFolder: data.projectName } });
      if (gasRes && gasRes.fileUrl) receiptUrl = gasRes.fileUrl;
    }
    const ledgerId = crypto.randomUUID();
    await db.prepare(`INSERT INTO project_ledger (id, project_id, type, description, amount, agent_name, agent_id, receipt_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
      .bind(ledgerId, data.projectId, data.type, data.description, Number(data.amount), data.agentName, data.agentId, receiptUrl).run();
    if (data.type === 'Expense' && data.isAbono && data.abonoAmount) {
      const abonoId = crypto.randomUUID();
      await db.prepare(`INSERT INTO project_ledger (id, project_id, type, description, amount, agent_name, agent_id, receipt_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
        .bind(abonoId, data.projectId, 'Abono', data.description + " (Abono)", Number(data.abonoAmount), data.agentName, data.agentId, null).run();
    }
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleUpdateProjectStatus(db, data) {
  await db.prepare("UPDATE projects SET status = ? WHERE name = ?").bind(data.status, data.projectName).run();
  return { success: true };
}

async function handleToggleTax(db, data) {
  try {
    await db.prepare("UPDATE projects SET is_taxable = ? WHERE name = ?").bind(data.isTaxable ? 1 : 0, data.projectName).run();
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

// ==========================================
// QUOTATIONS
// ==========================================

async function handleGetUserQuotations(db, data) {
  try {
    const totalSubquery = `(
      SELECT COALESCE(SUM(qi.quantity * qi.unit_cost), 0)
      FROM quotation_items qi
      WHERE qi.quotation_id = q.id
    ) AS total_amount`;

    let activeResults = [], deletedResults = [];

    if (data.role === 'Superuser') {
      const activeRes = await db.prepare(
        `SELECT q.*, ${totalSubquery} FROM quotations q WHERE q.is_deleted = 0 ORDER BY q.created_at DESC`
      ).all();
      activeResults = activeRes.results || [];

      if (data.showDeleted) {
        const delRes = await db.prepare(
          `SELECT q.*, ${totalSubquery} FROM quotations q WHERE q.is_deleted = 1 ORDER BY q.created_at DESC`
        ).all();
        deletedResults = delRes.results || [];
      }
    } else {
      const activeRes = await db.prepare(
        `SELECT q.*, ${totalSubquery} FROM quotations q WHERE q.prepared_by_id = ? AND q.is_deleted = 0 ORDER BY q.created_at DESC`
      ).bind(data.agentId).all();
      activeResults = activeRes.results || [];
    }

    return { success: true, data: activeResults, deletedData: deletedResults };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleGetQuotationDetail(db, data) {
  try {
    const q = await db.prepare("SELECT * FROM quotations WHERE quotation_number = ?").bind(data.qNumber).first();
    if (!q) return { success: false, message: "Quotation not found." };

    const itemsRes = await db.prepare("SELECT * FROM quotation_items WHERE quotation_id = ?").bind(q.id).all();

    const agent = await db.prepare("SELECT signature_url, contact FROM accounts WHERE id = ?").bind(q.prepared_by_id).first();
    const signatureUrl      = agent ? (agent.signature_url || null) : null;
    const preparedByContact = agent ? agent.contact : (q.prepared_by_contact || '');

    return {
      success: true,
      data: {
        quotationNumber:    q.quotation_number,
        customerName:       q.customer_name,
        customerTIN:        q.customer_tin || '',
        customerAddress:    q.customer_address || '',
        preparedBy:         q.prepared_by,
        preparedById:       q.prepared_by_id,
        preparedByContact:  preparedByContact,
        status:             q.status,
        createdAt:          q.created_at,
        items: (itemsRes.results || []).map(i => ({
          description: i.description,
          quantity:    i.quantity,
          unitCost:    i.unit_cost
        })),
        signatureUrl: signatureUrl
      }
    };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleUpdateQuotationStatus(db, data) {
  await db.prepare("UPDATE quotations SET status = ? WHERE quotation_number = ?").bind(data.status, data.qNumber).run();
  return { success: true };
}

async function handleDeleteQuotation(db, data) {
  const auth = await db.prepare("SELECT id FROM accounts WHERE id = ? AND password = ?").bind(data.userId, data.pass).first();
  if (!auth) return { success: false, message: "Incorrect Password." };
  await db.prepare("UPDATE quotations SET is_deleted = 1 WHERE quotation_number = ?").bind(data.qNumber).run();
  return { success: true };
}

async function handleRestoreQuotation(db, data) {
  const auth = await db.prepare("SELECT * FROM accounts WHERE username = ? AND password = ? AND role = 'Superuser'").bind(data.user, data.pass).first();
  if (!auth) return { success: false, message: "Not authorized." };
  await db.prepare("UPDATE quotations SET is_deleted = 0 WHERE quotation_number = ?").bind(data.qNumber).run();
  return { success: true };
}

async function handleProcessForm(db, data) {
  try {
    const quoteId = crypto.randomUUID();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await db.prepare("SELECT COUNT(*) as cnt FROM quotations WHERE quotation_number LIKE ?").bind(`Q${today}%`).first();
    const seq = String((countRes ? countRes.cnt : 0) + 1).padStart(4, '0');
    const qNumber = `Q${today}${seq}`;

    await db.prepare(`
      INSERT INTO quotations (id, quotation_number, customer_name, customer_tin, customer_address, prepared_by, prepared_by_id, status, is_deleted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Sent', 0, datetime('now'))
    `).bind(
      quoteId, qNumber,
      data.customerName,
      data.customerTIN || '',
      data.customerAddress || '',
      data.preparedBy,
      data.preparedById
    ).run();

    const items = data.itemDescription || [];
    for (let i = 0; i < items.length; i++) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO quotation_items (id, quotation_id, description, quantity, unit_cost)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        itemId, quoteId,
        items[i],
        Number(data.quantity[i]) || 1,
        Number(data.unitCost[i]) || 0
      ).run();
    }

    return { success: true, quotationNumber: qNumber };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleEditQuotation(db, data) {
  try {
    const q = await db.prepare("SELECT * FROM quotations WHERE quotation_number = ?").bind(data.qNumber).first();
    if (!q) return { success: false, message: "Quotation not found." };

    const caller = await db.prepare("SELECT role FROM accounts WHERE id = ?").bind(data.userId).first();
    if (!caller) return { success: false, message: "Unauthorized." };

    if (q.status === 'Approved' && caller.role !== 'Superuser') {
      return { success: false, message: "Cannot edit an Approved quotation." };
    }

    await db.prepare(`
      UPDATE quotations
      SET customer_name = ?, customer_tin = ?, customer_address = ?
      WHERE quotation_number = ?
    `).bind(
      data.customerName,
      data.customerTIN || '',
      data.customerAddress || '',
      data.qNumber
    ).run();

    await db.prepare("DELETE FROM quotation_items WHERE quotation_id = ?").bind(q.id).run();

    const items = data.itemDescription || [];
    for (let i = 0; i < items.length; i++) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO quotation_items (id, quotation_id, description, quantity, unit_cost)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        itemId, q.id,
        items[i],
        Number(data.quantity[i]) || 1,
        Number(data.unitCost[i]) || 0
      ).run();
    }

    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

// ==========================================
// CUSTOMERS
// ==========================================

async function handleGetCustomers(db, data) {
  try {
    const { results } = await db.prepare(
      "SELECT * FROM customers ORDER BY name ASC"
    ).all();
    return { success: true, data: results || [] };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleSaveCustomer(db, data) {
  try {
    const { name, tin, address, userId } = data;
    if (!name || !address) return { success: false, message: "Name and address are required." };

    const existing = await db.prepare("SELECT id FROM customers WHERE LOWER(name) = LOWER(?)").bind(name.trim()).first();

    if (existing) {
      // Update existing
      await db.prepare(
        "UPDATE customers SET tin = ?, address = ? WHERE id = ?"
      ).bind((tin || '').trim(), address.trim(), existing.id).run();
      return { success: true, id: existing.id, updated: true };
    } else {
      // Insert new
      const id = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO customers (id, name, tin, address, created_by_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
      ).bind(id, name.trim(), (tin || '').trim(), address.trim(), userId || null).run();
      return { success: true, id, updated: false };
    }
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function handleDeleteDbCustomer(db, data) {
  try {
    const { id, userId, pass } = data;
    // Require password confirmation
    const auth = await db.prepare("SELECT id FROM accounts WHERE id = ? AND password = ?").bind(userId, pass).first();
    if (!auth) return { success: false, message: "Incorrect password." };
    await db.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

async function proxyToGAS(gasUrl, originalPayload) {
  try {
    const response = await fetch(gasUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(originalPayload) });
    return await response.json();
  } catch (e) { return null; }
}

// ==========================================
// FINANCIAL DASHBOARD API
// ==========================================
async function handleProfessionalFinanceDashboard(db, data) {
  try {
    const transactions = [];

    // 1. Get Global Fixed Costs
    const fixedCostsRes = await db.prepare("SELECT * FROM project_ledger WHERE project_id = 'GLOBAL' AND type = 'FixedCost'").all();
    const fixedCosts = fixedCostsRes.results || [];
    
    for (const fc of fixedCosts) {
      const dateStr = fc.created_at ? fc.created_at.substring(0, 10) : new Date().toISOString().split('T')[0];
      
      transactions.push({
        id: fc.id || crypto.randomUUID(),
        date: dateStr,
        type: "Expense",
        description: fc.description || "Global Fixed Cost",
        amount: Number(Math.abs(Number(fc.amount)).toFixed(2)),
        project_name: "Etch Signage"
      });
    }

    // 2. Get Completed Projects and Calculate Company Net
    const projectsRes = await db.prepare("SELECT * FROM projects WHERE status = 'Completed'").all();
    const projects = projectsRes.results || [];
    
    if (projects.length > 0) {
      const ledgerRes = await db.prepare("SELECT * FROM project_ledger WHERE project_id != 'GLOBAL'").all();
      const allLedgers = ledgerRes.results || [];
      
      for (const p of projects) {
        const txs = allLedgers.filter(l => l.project_id === p.id);
        
        let pSales = 0;
        let pExp = 0;
        
        let lastTxDateStr = p.created_at ? p.created_at.substring(0, 10) : new Date().toISOString().split('T')[0];
        let lastTxTime = p.created_at ? new Date(p.created_at).getTime() : Date.now();
        
        for (const t of txs) {
          const amt = Number(t.amount);
          if (t.type === 'Sales') pSales += amt;
          else if (t.type === 'Expense') pExp += amt;
          
          const tTime = new Date(t.created_at).getTime();
          if (tTime > lastTxTime) {
            lastTxTime = tTime;
            lastTxDateStr = t.created_at.substring(0, 10);
          }
        }
        
        const isTaxable = (p.is_taxable !== 0);
        const taxAmt = isTaxable ? (pSales * 0.08) : 0;
        pExp += taxAmt;
        
        const netBeforeShares = pSales - pExp;
        const hasCo = p.co_agent && p.co_agent.trim() !== "";
        const shareRatio = hasCo ? (1 / 3) : 0.5;
        const totalAgentGrossShares = netBeforeShares * shareRatio * (hasCo ? 2 : 1);
        const pNetToCompany = netBeforeShares - totalAgentGrossShares;
        
        transactions.push({
          id: p.id || crypto.randomUUID(),
          date: lastTxDateStr,
          type: "Income",
          description: p.name,
          amount: Number(Math.abs(pNetToCompany).toFixed(2)),
          project_name: "Etch Signage"
        });
      }
    }

    return { success: true, data: { transactions } };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
