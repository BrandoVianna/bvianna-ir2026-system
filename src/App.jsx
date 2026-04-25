import { useState, useEffect, useCallback } from "react";

// ─── RISK SCORE ENGINE ───────────────────────────────────────────────────────
function calcRiskScore(data) {
  let score = 0;
  const flags = [];

  if (data.informalIncome) { score += 22; flags.push("Renda informal declarada"); }
  if (data.foreignIncome)  { score += 20; flags.push("Renda exterior detectada"); }
  if (data.hasMEI)         { score += 12; flags.push("MEI ativo no período"); }
  if (data.hasAssets)      { score += 15; flags.push("Movimentação patrimonial"); }
  if (data.hasDependents)  { score += 5;  flags.push("Dependentes informados"); }
  if (!data.bankUploaded)  { score += 8;  flags.push("Extratos bancários pendentes"); }
  if (!data.prevIRUploaded){ score += 8;  flags.push("IR anterior não enviado"); }
  if (data.meiRevenue > 81000) { score += 10; flags.push("Receita MEI acima do limite"); }

  const capped = Math.min(score, 100);
  const level = capped < 25 ? "baixo" : capped < 55 ? "moderado" : "elevado";
  const color = capped < 25 ? "#22c55e" : capped < 55 ? "#f59e0b" : "#ef4444";
  return { score: capped, level, color, flags };
}

// ─── THEME / DESIGN TOKENS ───────────────────────────────────────────────────
const C = {
  bg:        "#0a0b0d",
  surface:   "#111318",
  surfaceHi: "#181c24",
  border:    "#1e2330",
  borderHi:  "#2a3045",
  text:      "#e8eaf0",
  textMuted: "#6b7280",
  textDim:   "#3d4454",
  accent:    "#3b7ff0",
  accentDim: "#1d3d7a",
  gold:      "#c9a84c",
  goldDim:   "#6b521e",
  danger:    "#ef4444",
  warn:      "#f59e0b",
  success:   "#22c55e",
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', sans-serif; font-weight: 400; line-height: 1.6; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.borderHi}; border-radius: 2px; }
  input, textarea, select { font-family: 'DM Sans', sans-serif; }
  ::selection { background: ${C.accentDim}; color: ${C.text}; }
`;

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label style={{ display:"block", fontSize:"11px", fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color: C.textMuted, marginBottom:"8px" }}>
    {children}{required && <span style={{ color: C.accent, marginLeft: 4 }}>*</span>}
  </label>
);

const Input = ({ style, ...props }) => (
  <input
    {...props}
    style={{
      width:"100%", background: C.surface, border:`1px solid ${C.border}`,
      borderRadius:"8px", padding:"12px 16px", color: C.text, fontSize:"14px",
      outline:"none", transition:"border-color 0.2s",
      ...style
    }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const Textarea = ({ style, ...props }) => (
  <textarea
    {...props}
    style={{
      width:"100%", background: C.surface, border:`1px solid ${C.border}`,
      borderRadius:"8px", padding:"12px 16px", color: C.text, fontSize:"14px",
      outline:"none", resize:"vertical", minHeight:"100px", transition:"border-color 0.2s",
      ...style
    }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const Toggle = ({ checked, onChange, label, sublabel }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      display:"flex", alignItems:"flex-start", gap:"14px", cursor:"pointer",
      padding:"16px", background: checked ? C.accentDim+"33" : C.surface,
      border:`1px solid ${checked ? C.accent : C.border}`,
      borderRadius:"10px", transition:"all 0.2s", userSelect:"none"
    }}
  >
    <div style={{
      width:20, height:20, borderRadius:"50%", border:`2px solid ${checked ? C.accent : C.borderHi}`,
      background: checked ? C.accent : "transparent", flexShrink:0, marginTop:1,
      display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s"
    }}>
      {checked && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
    </div>
    <div>
      <div style={{ fontSize:"14px", fontWeight:500, color: checked ? C.text : C.textMuted }}>{label}</div>
      {sublabel && <div style={{ fontSize:"12px", color: C.textDim, marginTop:2 }}>{sublabel}</div>}
    </div>
  </div>
);

const UploadZone = ({ label, sublabel, uploaded, onUpload }) => {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onUpload(true); }}
      onClick={() => onUpload(true)}
      style={{
        border:`1.5px dashed ${uploaded ? C.success : dragging ? C.accent : C.borderHi}`,
        borderRadius:"10px", padding:"28px 20px", textAlign:"center",
        cursor:"pointer", transition:"all 0.2s",
        background: uploaded ? C.success+"11" : dragging ? C.accentDim+"22" : C.surface,
      }}
    >
      <div style={{ fontSize:"22px", marginBottom:"8px" }}>
        {uploaded ? "✓" : "⬆"}
      </div>
      <div style={{ fontSize:"13px", fontWeight:500, color: uploaded ? C.success : C.text }}>{label}</div>
      {sublabel && <div style={{ fontSize:"11px", color: C.textMuted, marginTop:4 }}>{sublabel}</div>}
      {uploaded && <div style={{ fontSize:"11px", color: C.success, marginTop:6, fontFamily:"'JetBrains Mono', monospace" }}>RECEBIDO</div>}
    </div>
  );
};

const SectionCard = ({ title, icon, children, style }) => (
  <div style={{
    background: C.surfaceHi, border:`1px solid ${C.border}`,
    borderRadius:"14px", padding:"28px", marginBottom:"20px", ...style
  }}>
    {title && (
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
        {icon && <span style={{ fontSize:"16px" }}>{icon}</span>}
        <h3 style={{ fontSize:"13px", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color: C.textMuted }}>{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const FieldRow = ({ children, gap = 16 }) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${children.length || 1}, 1fr)`, gap, marginBottom:16 }}>
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div><Label required={required}>{label}</Label>{children}</div>
);

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────
const STEPS = [
  { id:1, label:"Boas-vindas",      short:"Intro",          icon:"◈" },
  { id:2, label:"Identificação",    short:"Dados Pessoais",  icon:"◎" },
  { id:3, label:"Mapeamento",       short:"Rendimentos",     icon:"◐" },
  { id:4, label:"MEI / CNPJ",       short:"Pessoa Jurídica", icon:"◉" },
  { id:5, label:"Bancário",         short:"Reconciliação",   icon:"◑" },
  { id:6, label:"Despesas",         short:"Deduções Prof.",  icon:"◒" },
  { id:7, label:"Patrimônio",       short:"Bens & Dedução",  icon:"◓" },
  { id:8, label:"Declaração",       short:"Responsab.",      icon:"◔" },
  { id:9, label:"Diagnóstico",      short:"Resultado",       icon:"◕" },
];

// ─── INDIVIDUAL STEPS ────────────────────────────────────────────────────────

function Step1({ onNext }) {
  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{
        background:`linear-gradient(135deg, ${C.accentDim}44, ${C.surfaceHi})`,
        border:`1px solid ${C.borderHi}`, borderRadius:"16px", padding:"40px", marginBottom:28,
        position:"relative", overflow:"hidden"
      }}>
        <div style={{
          position:"absolute", top:-40, right:-40, width:160, height:160,
          borderRadius:"50%", border:`1px solid ${C.accentDim}44`, pointerEvents:"none"
        }} />
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8, background: C.accentDim+"66",
          border:`1px solid ${C.accentDim}`, borderRadius:20, padding:"4px 14px",
          fontSize:"11px", letterSpacing:"0.12em", textTransform:"uppercase", color: C.accent,
          marginBottom:20, fontWeight:500
        }}>
          <span>◈</span> Exercício Fiscal 2025 · IRPF 2026
        </div>
        <h1 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"32px", lineHeight:1.25, color: C.text, marginBottom:16 }}>
          Diagnóstico Tributário<br /><em style={{ color: C.accent }}>Pré-Declaração</em>
        </h1>
        <p style={{ fontSize:"14px", color: C.textMuted, lineHeight:1.7, marginBottom:24 }}>
          Este sistema realiza a <strong style={{ color: C.text }}>coleta técnica estruturada</strong> de todas as informações fiscais relevantes ao exercício 2025, com o objetivo de garantir que sua Declaração de Imposto de Renda seja elaborada com <strong style={{ color: C.text }}>máxima segurança, coerência fiscal e aproveitamento legal das deduções</strong>.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          {[
            ["Pré-Auditoria Técnica", "Identificação antecipada de inconsistências"],
            ["Minimização de Risco", "Adequação ao cruzamento da Receita Federal"],
            ["Aproveitamento Máximo", "Todas as deduções legais identificadas"],
            ["Sigilo Total", "Dados protegidos por contrato de confidencialidade"],
          ].map(([t, s]) => (
            <div key={t} style={{
              background: C.surface, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"14px 16px"
            }}>
              <div style={{ fontSize:"12px", fontWeight:600, color: C.text, marginBottom:4 }}>{t}</div>
              <div style={{ fontSize:"11px", color: C.textMuted }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{
          background: C.bg, border:`1px solid ${C.goldDim}`, borderRadius:10,
          padding:"14px 18px", display:"flex", gap:12, alignItems:"flex-start"
        }}>
          <span style={{ color: C.gold, fontSize:16 }}>⚠</span>
          <p style={{ fontSize:"12px", color: C.textMuted, lineHeight:1.6 }}>
            <strong style={{ color: C.gold }}>Importante:</strong> Este diagnóstico <strong style={{ color: C.text }}>não constitui a declaração final</strong>. As informações coletadas serão auditadas pela equipe técnica da BVianna Consulting antes da transmissão oficial via GOV.BR / Receita Federal.
          </p>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:28, padding:"14px 18px",
        background: C.surface, border:`1px solid ${C.border}`, borderRadius:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background: C.accentDim+"44",
          border:`1px solid ${C.accentDim}`, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, color: C.accent, flexShrink:0 }}>i</div>
        <p style={{ fontSize:"12px", color: C.textMuted }}>
          Tempo estimado de preenchimento: <strong style={{ color: C.text }}>12–20 minutos</strong>. Suas respostas são salvas automaticamente durante o preenchimento.
        </p>
      </div>

      <button
        onClick={onNext}
        style={{
          width:"100%", padding:"16px", background: C.accent, color:"#fff",
          border:"none", borderRadius:"10px", fontSize:"14px", fontWeight:600,
          cursor:"pointer", letterSpacing:"0.04em", transition:"opacity 0.2s"
        }}
        onMouseEnter={e => e.target.style.opacity = 0.88}
        onMouseLeave={e => e.target.style.opacity = 1}
      >
        Iniciar Diagnóstico Fiscal →
      </button>
    </div>
  );
}

function Step2({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Dados Pessoais" icon="◎">
        <FieldRow>
          <Field label="Nome Completo" required><Input value={data.name||""} onChange={e=>u("name",e.target.value)} placeholder="Conforme documento oficial" /></Field>
          <Field label="CPF" required><Input value={data.cpf||""} onChange={e=>u("cpf",e.target.value)} placeholder="000.000.000-00" /></Field>
        </FieldRow>
        <FieldRow>
          <Field label="WhatsApp" required><Input value={data.whatsapp||""} onChange={e=>u("whatsapp",e.target.value)} placeholder="(11) 99999-9999" /></Field>
          <Field label="E-mail" required><Input value={data.email||""} onChange={e=>u("email",e.target.value)} placeholder="seu@email.com" type="email" /></Field>
        </FieldRow>
        <FieldRow>
          <Field label="Data de Nascimento"><Input value={data.birth||""} onChange={e=>u("birth",e.target.value)} placeholder="DD/MM/AAAA" /></Field>
          <Field label="Município / UF de Residência"><Input value={data.city||""} onChange={e=>u("city",e.target.value)} placeholder="São Paulo / SP" /></Field>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Dependentes" icon="◑">
        <Toggle
          checked={data.hasDependents||false}
          onChange={v=>u("hasDependents",v)}
          label="Possuo dependentes a declarar em 2026"
          sublabel="Filhos, cônjuge, pais ou outros dependentes legais"
        />
        {data.hasDependents && (
          <div style={{ marginTop:16 }}>
            <Field label="Relação de dependentes (nome, CPF, grau de parentesco)">
              <Textarea value={data.dependentsDetail||""} onChange={e=>u("dependentsDetail",e.target.value)}
                placeholder="Ex: João Silva, 123.456.789-00, Filho — Maria Silva, 987.654.321-00, Cônjuge" />
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Documentação" icon="◒">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <UploadZone
            label="Declaração IR 2025 (exercício 2024)"
            sublabel="Arquivo .DEC ou PDF da declaração anterior"
            uploaded={data.prevIRUploaded}
            onUpload={v=>u("prevIRUploaded",v)}
          />
          <UploadZone
            label="RG / CNH"
            sublabel="Documento de identidade com foto"
            uploaded={data.docUploaded}
            onUpload={v=>u("docUploaded",v)}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function Step3({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Fontes de Renda 2025" icon="◐">
        <Field label="Descreva todas as suas fontes de renda no ano de 2025" required>
          <Textarea
            value={data.incomeDesc||""}
            onChange={e=>u("incomeDesc",e.target.value)}
            style={{ minHeight:120 }}
            placeholder="Ex: salário como CLT na empresa X (R$ X/mês), cachês como músico em shows, aulas particulares, consultorias, aluguéis, dividendos..."
          />
        </Field>
        <Field label="Estimativa de renda total bruta no período (R$)">
          <Input value={data.totalIncome||""} onChange={e=>u("totalIncome",e.target.value)} placeholder="R$ 0,00" />
        </Field>
      </SectionCard>

      <SectionCard title="Renda Informal / Não Documentada" icon="◑">
        <Toggle
          checked={data.informalIncome||false}
          onChange={v=>u("informalIncome",v)}
          label="Recebi valores via PIX, dinheiro ou transferência sem emissão de nota fiscal"
          sublabel="Cachês, prestação de serviço informal, doações significativas ou qualquer entrada sem documentação fiscal"
        />
        {data.informalIncome && (
          <div style={{ marginTop:16 }}>
            <Field label="Descreva os recebimentos informais e seus valores aproximados">
              <Textarea
                value={data.informalDetail||""}
                onChange={e=>u("informalDetail",e.target.value)}
                placeholder="Reconstituição mês a mês: Jan R$ X — shows, Fev R$ X — consultoria, etc."
              />
            </Field>
            <div style={{ marginTop:12, padding:"14px 16px", background: C.warn+"11",
              border:`1px solid ${C.warn}44`, borderRadius:8 }}>
              <p style={{ fontSize:"12px", color: C.warn }}>
                ⚠ Renda informal eleva o índice de risco fiscal. Nossa equipe orientará a melhor forma de regularização e enquadramento.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Renda do Exterior" icon="◒">
        <Toggle
          checked={data.foreignIncome||false}
          onChange={v=>u("foreignIncome",v)}
          label="Recebi ou tenho renda de fonte estrangeira"
          sublabel="Pagamentos internacionais, streaming digital (Spotify, YouTube), contratos com empresas estrangeiras, heranças, remessas"
        />
        {data.foreignIncome && (
          <div style={{ marginTop:16 }}>
            <FieldRow>
              <Field label="País de origem">
                <Input value={data.foreignCountry||""} onChange={e=>u("foreignCountry",e.target.value)} placeholder="Ex: EUA, Portugal, Alemanha" />
              </Field>
              <Field label="Valor estimado (R$)">
                <Input value={data.foreignAmount||""} onChange={e=>u("foreignAmount",e.target.value)} placeholder="R$ 0,00" />
              </Field>
            </FieldRow>
            <Field label="Natureza da renda exterior">
              <Textarea
                value={data.foreignDesc||""}
                onChange={e=>u("foreignDesc",e.target.value)}
                placeholder="Ex: royalties musicais via distribuidor digital, salário de empresa americana..."
              />
            </Field>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Step4({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Pessoa Jurídica / MEI" icon="◉">
        <Toggle
          checked={data.hasMEI||false}
          onChange={v=>u("hasMEI",v)}
          label="Sou MEI ou possuo CNPJ ativo"
          sublabel="Qualquer atividade formalizada como pessoa jurídica em 2025"
        />
        {data.hasMEI && (
          <div style={{ marginTop:16 }}>
            <FieldRow>
              <Field label="CNPJ" required>
                <Input value={data.cnpj||""} onChange={e=>u("cnpj",e.target.value)} placeholder="00.000.000/0001-00" />
              </Field>
              <Field label="Razão Social">
                <Input value={data.razaoSocial||""} onChange={e=>u("razaoSocial",e.target.value)} placeholder="Nome Empresarial" />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Atividade principal (CNAE)">
                <Input value={data.cnae||""} onChange={e=>u("cnae",e.target.value)} placeholder="Ex: 9001-9/01 — Produção musical" />
              </Field>
              <Field label="Receita Bruta Total 2025 (R$)">
                <Input value={data.meiRevenue||""} onChange={e=>u("meiRevenue",e.target.value)} placeholder="R$ 0,00" type="number" />
              </Field>
            </FieldRow>
            {(data.meiRevenue||0) > 81000 && (
              <div style={{ marginBottom:16, padding:"14px 16px", background: C.danger+"11",
                border:`1px solid ${C.danger}44`, borderRadius:8 }}>
                <p style={{ fontSize:"12px", color: C.danger }}>
                  ◉ Receita declarada excede o limite MEI (R$ 81.000). Verificar necessidade de desenquadramento e regularização fiscal.
                </p>
              </div>
            )}
            <FieldRow>
              <Field label="Valor total de notas emitidas (R$)">
                <Input value={data.invoicesTotal||""} onChange={e=>u("invoicesTotal",e.target.value)} placeholder="R$ 0,00" />
              </Field>
              <Field label="DAS pagos em 2025 (meses)">
                <Input value={data.dasPaid||""} onChange={e=>u("dasPaid",e.target.value)} placeholder="Ex: 12 meses" />
              </Field>
            </FieldRow>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <UploadZone label="Notas Fiscais emitidas" sublabel="PDF / ZIP" uploaded={data.invoicesUploaded} onUpload={v=>u("invoicesUploaded",v)} />
              <UploadZone label="Comprovantes DAS" sublabel="Todos os meses pagos" uploaded={data.dasUploaded} onUpload={v=>u("dasUploaded",v)} />
              <UploadZone label="Relatório MEI 2025" sublabel="Extrato ou DASN-SIMEI" uploaded={data.meiReportUploaded} onUpload={v=>u("meiReportUploaded",v)} />
            </div>
          </div>
        )}
        {!data.hasMEI && (
          <div style={{ marginTop:12, padding:"14px 16px", background: C.surface, border:`1px solid ${C.border}`, borderRadius:8 }}>
            <p style={{ fontSize:"12px", color: C.textMuted }}>Nenhuma atividade como pessoa jurídica identificada para este exercício.</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Step5({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Contas Bancárias PF" icon="◑">
        <Field label="Liste todas as contas de pessoa física (banco, agência, conta)" required>
          <Textarea
            value={data.bankAccountsPF||""}
            onChange={e=>u("bankAccountsPF",e.target.value)}
            placeholder="Ex: Itaú CC 1234-5 Ag 0001 / Nubank CC / C6 Bank Poupança..."
          />
        </Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
          <UploadZone label="Extratos PF — Todos os bancos" sublabel="Jan–Dez 2025 · PDF ou CSV" uploaded={data.bankUploaded} onUpload={v=>u("bankUploaded",v)} />
          <UploadZone label="Relatório de PIX recebidos" sublabel="Extrato de entradas via PIX" uploaded={data.pixUploaded} onUpload={v=>u("pixUploaded",v)} />
        </div>
      </SectionCard>

      {data.hasMEI && (
        <SectionCard title="Contas Bancárias PJ" icon="◒">
          <Field label="Liste as contas empresariais vinculadas ao CNPJ">
            <Textarea value={data.bankAccountsPJ||""} onChange={e=>u("bankAccountsPJ",e.target.value)}
              placeholder="Ex: Santander Empresas 5678-9 / Inter PJ..." />
          </Field>
          <div style={{ marginTop:12 }}>
            <UploadZone label="Extratos PJ — Conta Empresarial" sublabel="Jan–Dez 2025" uploaded={data.bankPJUploaded} onUpload={v=>u("bankPJUploaded",v)} />
          </div>
        </SectionCard>
      )}

      <SectionCard title="Transferências não-renda" icon="◓">
        <Field label="Explique transferências de grande volume que não são renda (empréstimos recebidos, devoluções, venda de bens, heranças etc.)">
          <Textarea value={data.nonIncomeTransfers||""} onChange={e=>u("nonIncomeTransfers",e.target.value)}
            placeholder="Ex: Recebi R$ 30.000 de devolução de empréstimo feito a familiar em 2023..." />
        </Field>
      </SectionCard>
    </div>
  );
}

function Step6({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Despesas Profissionais Dedutíveis" icon="◒">
        <div style={{ padding:"14px 16px", background: C.accentDim+"22", border:`1px solid ${C.accentDim}`,
          borderRadius:8, marginBottom:20 }}>
          <p style={{ fontSize:"12px", color: C.accent }}>
            Informe todas as despesas relacionadas à sua atividade profissional. Nossa equipe avaliará a dedutibilidade conforme legislação vigente.
          </p>
        </div>
        <Field label="Liste todas as despesas com atividade profissional em 2025 (equipamentos, softwares, cursos, deslocamentos, materiais)">
          <Textarea value={data.profExpenses||""} onChange={e=>u("profExpenses",e.target.value)}
            style={{ minHeight:140 }}
            placeholder="Ex: Guitar Center USA — guitarra R$ 8.500 / iZotope Ozone — R$ 900 / Curso de Mix Online — R$ 1.200 / Passagem SP-RJ show — R$ 350..." />
        </Field>
        <Field label="Valor total estimado das despesas profissionais (R$)">
          <Input value={data.profExpensesTotal||""} onChange={e=>u("profExpensesTotal",e.target.value)} placeholder="R$ 0,00" />
        </Field>
        <div style={{ marginTop:12 }}>
          <UploadZone label="Comprovantes de despesas profissionais" sublabel="Notas, recibos, comprovantes de pagamento" uploaded={data.expensesUploaded} onUpload={v=>u("expensesUploaded",v)} />
        </div>
      </SectionCard>
    </div>
  );
}

function Step7({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Bens e Direitos / Patrimônio" icon="◓">
        <Toggle
          checked={data.hasAssets||false}
          onChange={v=>u("hasAssets",v)}
          label="Adquiri, vendi ou realizei movimentação patrimonial relevante em 2025"
          sublabel="Imóveis, veículos, investimentos, participações societárias, criptoativos, obras de arte"
        />
        {data.hasAssets && (
          <div style={{ marginTop:16 }}>
            <Field label="Descreva a movimentação patrimonial">
              <Textarea value={data.assetsDesc||""} onChange={e=>u("assetsDesc",e.target.value)}
                placeholder="Ex: Venda de apartamento por R$ 350.000 (custo histórico R$ 280.000) / Compra de veículo R$ 45.000 / Investimentos em CDBs..." />
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Deduções Legais Pessoais" icon="◔">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            ["health", "Saúde", "Médicos, dentistas, planos, hospitais, lab"],
            ["education", "Educação", "Escolas, faculdades, cursos regulares"],
            ["inss", "INSS / Previdência Oficial", "Contribuições mensais ao INSS"],
            ["pension", "Pensão Alimentícia", "Valor pago conforme decisão judicial"],
            ["privatePension", "Previdência Privada (PGBL)", "Contribuições ao plano PGBL"],
          ].map(([k, label, sub]) => (
            <Toggle key={k} checked={data[k]||false} onChange={v=>u(k,v)} label={label} sublabel={sub} />
          ))}
        </div>
        <Field label="Valores detalhados por categoria de dedução (R$)">
          <Textarea value={data.deductionsDetail||""} onChange={e=>u("deductionsDetail",e.target.value)}
            placeholder="Saúde: R$ X — plano unimed anual / Educação: R$ X — faculdade filha / INSS: R$ X — contribuição como autônomo..." />
        </Field>
        <div style={{ marginTop:12 }}>
          <UploadZone label="Comprovantes de deduções" sublabel="Recibos médicos, mensalidades, contratos" uploaded={data.deductionsUploaded} onUpload={v=>u("deductionsUploaded",v)} />
        </div>
      </SectionCard>
    </div>
  );
}

function Step8({ data, setData }) {
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  const [signed, setSigned] = useState(false);
  return (
    <div>
      <SectionCard title="Termo de Responsabilidade" icon="◔" style={{ borderColor: C.gold+"55" }}>
        <div style={{
          background: C.bg, border:`1px solid ${C.goldDim}`, borderRadius:10,
          padding:"24px", marginBottom:20, fontFamily:"'DM Sans', sans-serif",
          fontSize:"13px", lineHeight:1.8, color: C.textMuted
        }}>
          <p style={{ marginBottom:12, fontWeight:500, color: C.gold, fontSize:"11px", letterSpacing:"0.1em", textTransform:"uppercase" }}>
            Termo de Responsabilidade e Autorização — BVianna Consulting
          </p>
          <p style={{ marginBottom:10 }}>
            Eu, o(a) contribuinte identificado(a) neste diagnóstico, declaro que as informações prestadas são <strong style={{ color: C.text }}>verídicas, completas e de minha inteira responsabilidade</strong>, conforme o art. 299 do Código Penal e legislação tributária aplicável.
          </p>
          <p style={{ marginBottom:10 }}>
            Estou ciente de que este formulário constitui <strong style={{ color: C.text }}>instrumento de coleta técnica pré-declaração</strong>, e que a transmissão oficial à Receita Federal ocorrerá somente após revisão e aprovação da equipe BVianna Consulting.
          </p>
          <p>
            Autorizo a BVianna Consulting a utilizar estas informações exclusivamente para fins de <strong style={{ color: C.text }}>elaboração da Declaração de IRPF 2026</strong>, comprometendo-se ao sigilo e à proteção dos dados conforme a LGPD (Lei 13.709/2018).
          </p>
        </div>

        <Field label="Observações finais ou informações complementares">
          <Textarea value={data.finalObs||""} onChange={e=>u("finalObs",e.target.value)}
            placeholder="Qualquer informação adicional relevante que não se enquadre nos campos anteriores..." />
        </Field>

        <div style={{ marginTop:20, padding:"20px 24px",
          background: signed ? C.success+"11" : C.surface,
          border:`1px solid ${signed ? C.success : C.borderHi}`,
          borderRadius:10, transition:"all 0.3s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom: signed ? 16 : 0 }}>
            <div
              onClick={() => { setSigned(!signed); u("signed", !signed); }}
              style={{
                width:22, height:22, borderRadius:4, border:`2px solid ${signed ? C.success : C.borderHi}`,
                background: signed ? C.success : "transparent", cursor:"pointer", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s"
              }}
            >
              {signed && <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>✓</span>}
            </div>
            <span style={{ fontSize:"13px", color: signed ? C.text : C.textMuted }}>
              Li, compreendi e concordo com o Termo de Responsabilidade acima
            </span>
          </div>
          {signed && (
            <div style={{ borderTop:`1px solid ${C.success}33`, paddingTop:16 }}>
              <Field label="Assinatura eletrônica (nome completo como confirmação)">
                <Input value={data.signature||""} onChange={e=>u("signature",e.target.value)}
                  placeholder="Digite seu nome completo como assinatura eletrônica" />
              </Field>
              <p style={{ fontSize:"11px", color: C.textMuted, marginTop:8 }}>
                Data/hora do aceite: {new Date().toLocaleString("pt-BR")} · IP registrado
              </p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function Step9({ data }) {
  const { score, level, color, flags } = calcRiskScore(data);
  const levelLabel = { baixo:"BAIXO", moderado:"MODERADO", elevado:"ELEVADO" }[level];
  const circle = 2 * Math.PI * 54;
  const offset = circle - (score / 100) * circle;

  return (
    <div>
      {/* Score Hero */}
      <div style={{
        background:`linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})`,
        border:`1px solid ${color}44`, borderRadius:16, padding:40,
        textAlign:"center", marginBottom:24, position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"relative", width:140, height:140, margin:"0 auto 24px" }}>
          <svg width={140} height={140} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={70} cy={70} r={54} fill="none" stroke={C.border} strokeWidth={6} />
            <circle cx={70} cy={70} r={54} fill="none" stroke={color} strokeWidth={6}
              strokeDasharray={circle} strokeDashoffset={offset}
              strokeLinecap="round" style={{ transition:"stroke-dashoffset 1.2s ease" }} />
          </svg>
          <div style={{
            position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center"
          }}>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:"36px", fontWeight:500, color, lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:"10px", letterSpacing:"0.1em", color: C.textMuted, textTransform:"uppercase" }}>/ 100</div>
          </div>
        </div>

        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          background: color+"22", border:`1px solid ${color}55`,
          borderRadius:20, padding:"6px 18px", marginBottom:16
        }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:color }} />
          <span style={{ fontSize:"12px", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color }}>
            RISCO {levelLabel}
          </span>
        </div>

        <h2 style={{ fontFamily:"'DM Serif Display', serif", fontSize:"22px", color: C.text, marginBottom:8 }}>
          {level === "baixo" ? "Perfil Fiscal Consistente" : level === "moderado" ? "Pontos de Atenção Identificados" : "Revisão Técnica Prioritária"}
        </h2>
        <p style={{ fontSize:"13px", color: C.textMuted, maxWidth:480, margin:"0 auto" }}>
          {level === "baixo"
            ? "Sua declaração apresenta perfil de baixa complexidade. A equipe BVianna Consulting realizará a revisão final antes da transmissão."
            : level === "moderado"
            ? "Foram identificados itens que requerem atenção técnica especializada. Nossa equipe entrará em contato para orientações adicionais."
            : "Seu perfil fiscal possui elementos que demandam análise cuidadosa antes da transmissão. Prioridade de atendimento pela equipe técnica."
          }
        </p>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <SectionCard title="Fatores de Risco Identificados" icon="◎">
          <div style={{ display:"grid", gap:8 }}>
            {flags.map(f => (
              <div key={f} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                background: C.surface, border:`1px solid ${C.border}`, borderRadius:8
              }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background: C.warn, flexShrink:0 }} />
                <span style={{ fontSize:"13px", color: C.text }}>{f}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Summary */}
      <SectionCard title="Síntese do Diagnóstico" icon="◕">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            ["Cliente", data.name || "Não informado"],
            ["CPF", data.cpf || "Não informado"],
            ["WhatsApp", data.whatsapp || "Não informado"],
            ["Dependentes", data.hasDependents ? "Sim" : "Não"],
            ["Renda Informal", data.informalIncome ? "Declarada" : "Não declarada"],
            ["Renda Exterior", data.foreignIncome ? "Declarada" : "Não declarada"],
            ["MEI / CNPJ", data.hasMEI ? data.cnpj || "Informado" : "Não possui"],
            ["Movimentação Patrimonial", data.hasAssets ? "Identificada" : "Não identificada"],
            ["Extratos Bancários", data.bankUploaded ? "✓ Enviados" : "Pendente"],
            ["IR Anterior", data.prevIRUploaded ? "✓ Enviado" : "Pendente"],
          ].map(([k, v]) => (
            <div key={k} style={{ padding:"12px 14px", background: C.surface, border:`1px solid ${C.border}`, borderRadius:8 }}>
              <div style={{ fontSize:"10px", color: C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:"13px", color: C.text, fontWeight:500 }}>{v}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Next steps */}
      <div style={{
        background: C.accentDim+"33", border:`1px solid ${C.accentDim}`,
        borderRadius:14, padding:28, marginTop:8
      }}>
        <div style={{ fontSize:"11px", letterSpacing:"0.1em", textTransform:"uppercase", color: C.accent, marginBottom:12, fontWeight:600 }}>
          Próximos Passos
        </div>
        {[
          "Sua coleta foi registrada com sucesso pela BVianna Consulting",
          "Nossa equipe técnica realizará a pré-auditoria das informações em até 48h úteis",
          "Você receberá contato via WhatsApp para alinhamento final",
          "Após aprovação, a declaração será transmitida via GOV.BR / Receita Federal",
        ].map((s, i) => (
          <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom: i < 3 ? 12 : 0 }}>
            <div style={{
              width:22, height:22, borderRadius:"50%", background: C.accent, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"11px", fontWeight:700, color:"#fff"
            }}>{i+1}</div>
            <span style={{ fontSize:"13px", color: C.textMuted, paddingTop:2 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ step, data }) {
  const { score, level, color } = calcRiskScore(data);
  const circle = 2 * Math.PI * 28;
  const offset = circle - (score / 100) * circle;

  return (
    <div style={{
      width:260, flexShrink:0, background: C.surface,
      borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column",
      height:"100vh", position:"sticky", top:0, overflowY:"auto"
    }}>
      {/* Logo */}
      <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:"15px", color: C.text, marginBottom:2 }}>
          BVianna Consulting
        </div>
        <div style={{ fontSize:"10px", color: C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Diagnóstico IR 2026
        </div>
      </div>

      {/* Risk score mini */}
      {step > 1 && (
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:"10px", color: C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
            Índice de Risco Fiscal
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative", width:60, height:60, flexShrink:0 }}>
              <svg width={60} height={60} style={{ transform:"rotate(-90deg)" }}>
                <circle cx={30} cy={30} r={28} fill="none" stroke={C.border} strokeWidth={4} />
                <circle cx={30} cy={30} r={28} fill="none" stroke={color} strokeWidth={4}
                  strokeDasharray={circle} strokeDashoffset={offset} strokeLinecap="round"
                  style={{ transition:"stroke-dashoffset 0.8s ease" }} />
              </svg>
              <div style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'JetBrains Mono', monospace", fontSize:"14px", fontWeight:500, color
              }}>{score}</div>
            </div>
            <div>
              <div style={{ fontSize:"11px", fontWeight:600, color, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                {level}
              </div>
              <div style={{ fontSize:"10px", color: C.textMuted, marginTop:2 }}>risco identificado</div>
            </div>
          </div>
        </div>
      )}

      {/* Steps nav */}
      <div style={{ padding:"16px 12px", flex:1 }}>
        {STEPS.map(s => {
          const isActive = s.id === step;
          const isDone = s.id < step;
          return (
            <div key={s.id} style={{
              display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
              borderRadius:8, marginBottom:2,
              background: isActive ? C.accentDim+"44" : "transparent",
              border:`1px solid ${isActive ? C.accentDim : "transparent"}`,
              transition:"all 0.2s"
            }}>
              <div style={{
                width:22, height:22, borderRadius:"50%", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"10px", fontWeight:700,
                background: isDone ? C.success+"33" : isActive ? C.accent : C.surfaceHi,
                color: isDone ? C.success : isActive ? "#fff" : C.textDim,
                border:`1px solid ${isDone ? C.success+"55" : isActive ? C.accent : C.border}`,
              }}>
                {isDone ? "✓" : s.id}
              </div>
              <div>
                <div style={{ fontSize:"12px", fontWeight: isActive ? 600 : 400, color: isActive ? C.text : isDone ? C.textMuted : C.textDim }}>
                  {s.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:"10px", color: C.textDim, letterSpacing:"0.06em" }}>
          CNPJ 56.222.931/0001-99<br />
          São Paulo / SP · 2026
        </div>
      </div>
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div style={{ height:2, background: C.border, position:"relative" }}>
      <div style={{
        height:"100%", background: C.accent, width:`${pct}%`,
        transition:"width 0.5s ease", boxShadow:`0 0 8px ${C.accent}66`
      }} />
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const STORAGE_KEY = "bvianna_ir2026_v1";
  const [step, setStep] = useState(1);
  const [data, setData] = useState({});

  // Persist to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { step: s, data: d } = JSON.parse(saved);
        if (s) setStep(s);
        if (d) setData(d);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data })); } catch {}
  }, [step, data]);

  const canAdvance = useCallback(() => {
    if (step === 8) return data.signed && data.signature?.trim().length > 3;
    return true;
  }, [step, data]);

  const stepContent = () => {
    switch (step) {
      case 1: return <Step1 onNext={() => setStep(2)} />;
      case 2: return <Step2 data={data} setData={setData} />;
      case 3: return <Step3 data={data} setData={setData} />;
      case 4: return <Step4 data={data} setData={setData} />;
      case 5: return <Step5 data={data} setData={setData} />;
      case 6: return <Step6 data={data} setData={setData} />;
      case 7: return <Step7 data={data} setData={setData} />;
      case 8: return <Step8 data={data} setData={setData} />;
      case 9: return <Step9 data={data} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <Sidebar step={step} data={data} />

        {/* Main content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <ProgressBar step={step} />

          {/* Header */}
          {step > 1 && (
            <div style={{
              padding:"16px 40px", borderBottom:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background: C.surface
            }}>
              <div>
                <div style={{ fontSize:"11px", color: C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Etapa {step} de {STEPS.length} · {STEPS[step-1].short}
                </div>
                <div style={{ fontSize:"16px", fontFamily:"'DM Serif Display', serif", color: C.text, marginTop:2 }}>
                  {STEPS[step-1].label}
                </div>
              </div>
              <div style={{
                fontSize:"11px", fontFamily:"'JetBrains Mono', monospace",
                color: C.textDim, background: C.surfaceHi, padding:"4px 10px", borderRadius:4
              }}>
                IRPF · EX 2025 · BASE 2026
              </div>
            </div>
          )}

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding: step === 1 ? "60px 40px" : "40px" }}>
            {stepContent()}
          </div>

          {/* Footer nav */}
          {step > 1 && step < 9 && (
            <div style={{
              padding:"20px 40px", borderTop:`1px solid ${C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center",
              background: C.surface
            }}>
              <button
                onClick={() => setStep(s => Math.max(1, s - 1))}
                style={{
                  padding:"10px 24px", background:"transparent", border:`1px solid ${C.border}`,
                  borderRadius:8, color: C.textMuted, fontSize:"13px", cursor:"pointer"
                }}
              >
                ← Voltar
              </button>
              <div style={{ fontSize:"11px", color: C.textDim }}>
                Salvo automaticamente
              </div>
              <button
                onClick={() => { if (canAdvance()) setStep(s => Math.min(9, s + 1)); }}
                disabled={!canAdvance()}
                style={{
                  padding:"10px 28px",
                  background: canAdvance() ? C.accent : C.surfaceHi,
                  border:"none", borderRadius:8,
                  color: canAdvance() ? "#fff" : C.textDim,
                  fontSize:"13px", fontWeight:600, cursor: canAdvance() ? "pointer" : "not-allowed",
                  transition:"all 0.2s"
                }}
              >
                {step === 8 ? "Concluir Diagnóstico →" : "Próxima Etapa →"}
              </button>
            </div>
          )}

          {step === 9 && (
            <div style={{
              padding:"20px 40px", borderTop:`1px solid ${C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center",
              background: C.surface
            }}>
              <button
                onClick={() => setStep(8)}
                style={{
                  padding:"10px 24px", background:"transparent", border:`1px solid ${C.border}`,
                  borderRadius:8, color: C.textMuted, fontSize:"13px", cursor:"pointer"
                }}
              >
                ← Revisar
              </button>
              <button
                onClick={() => {
                  try { localStorage.removeItem(STORAGE_KEY); } catch {}
                  alert("Diagnóstico enviado! A equipe BVianna Consulting entrará em contato em breve via WhatsApp.");
                }}
                style={{
                  padding:"10px 28px", background: C.gold, border:"none",
                  borderRadius:8, color: "#000", fontSize:"13px", fontWeight:700, cursor:"pointer"
                }}
              >
                ✓ Confirmar Envio à BVianna Consulting
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
