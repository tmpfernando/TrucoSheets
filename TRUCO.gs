const ORDEM_TRUCO = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const MANILHAS = { "♣": 104, "♥": 103, "♠": 102, "♦": 101 };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Scripts').addItem('🃏', 'abrirMaoJogador').addToUi();
}

function abrirMaoJogador() {
  const html = HtmlService.createTemplateFromFile('InterfaceJogador').evaluate()
      .setTitle('Truco Royale').setWidth(600).setHeight(850);
  SpreadsheetApp.getUi().showModalDialog(html, 'Truco Royale');
}

function prepararNovaMao() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mesa = ss.getSheetByName("Mesa");
  mesa.getRange("F2:F5").setValues([[""], [""], [1], ["Nenhum"]]);
  mesa.getRange("A2:C11").clearContent();
  return "Mesa Limpa";
}

function distribuirCartas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mesa = ss.getSheetByName("Mesa");
  const dados = ss.getSheetByName("Dados");
  if (mesa.getRange("F2").getValue() !== "") return "Já distribuído";
  
  let u = dados.getRange("D1").getValue();
  let d = (u === "Jogador 1") ? "Jogador 2" : "Jogador 1";
  dados.getRange("D1").setValue(d);
  
  mesa.getRange("F3").setValue(d);
  mesa.getRange("F4").setValue(1);
  mesa.getRange("F5").setValue("Nenhum");
  
  const s = ["♥", "♠", "♦", "♣"], v = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
  let b = []; s.forEach(si => v.forEach(vi => b.push(vi + " " + si)));
  b.sort(() => Math.random() - 0.5);
  
  dados.getRange("A2:B4").clearContent();
  for(let i=0; i<3; i++) dados.appendRow([b.pop(), b.pop()]);
  mesa.getRange("F2").setValue(b.pop());
  return "OK";
}

function jogarCarta(p, c, esc) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mesa = ss.getSheetByName("Mesa");
  if (mesa.getRange("F5").getValue() !== "Nenhum") return;
  
  const dados = ss.getSheetByName("Dados");
  const col = parseInt(p);
  const range = dados.getRange(2, col, 3);
  const vals = range.getValues().flat();
  const idx = vals.indexOf(c);
  if (idx === -1) return;
  
  mesa.appendRow([mesa.getLastRow(), "Jogador " + p, esc ? "🙈 VIRADA" : c]);
  range.getCell(idx + 1, 1).clearContent();
  
  const h = mesa.getRange("A2:C11").getValues().filter(r => r[1] !== "");
  const vira = mesa.getRange("F2").getValue();
  
  if (h.length % 2 !== 0) {
    mesa.getRange("F3").setValue(p == 1 ? "Jogador 2" : "Jogador 1");
  } else {
    const res = analisarPartida(h, vira);
    if (res.finalizado) finalizarRodada(res.vencedorJogo, parseInt(mesa.getRange("F4").getValue()));
    else mesa.getRange("F3").setValue(res.vencedorUltimaRodada);
  }
}

function analisarPartida(h, vira) {
  let vJ1 = 0, vJ2 = 0, v1 = null, statusRodadas = [];
  const vV = vira.split(" ")[0];
  const mV = ORDEM_TRUCO[(ORDEM_TRUCO.indexOf(vV) + 1) % 10];
  const f = (c) => {
    if (!c || c.includes("🙈") || c.includes("VIRADA")) return -1;
    let [val, nai] = c.split(" ");
    return (val === mV) ? MANILHAS[nai] : ORDEM_TRUCO.indexOf(val);
  };
  for (let i = 0; i < h.length; i += 2) {
    if (h[i+1]) {
      const f1 = f(h[i][2]), f2 = f(h[i+1][2]);
      const p1 = h[i][1], p2 = h[i+1][1];
      let win = (f1 > f2) ? p1 : (f2 > f1 ? p2 : "Empate");
      statusRodadas.push(win);
      if (win === "Jogador 1") vJ1++; else if (win === "Jogador 2") vJ2++; else { vJ1++; vJ2++; }
      if (i === 0) v1 = win;
    }
  }
  let fin = false, vMao = null;
  if (vJ1 >= 2 && vJ1 > vJ2) { fin = true; vMao = "Jogador 1"; }
  else if (vJ2 >= 2 && vJ2 > vJ1) { fin = true; vMao = "Jogador 2"; }
  else if (h.length >= 6) {
    fin = true; 
    vMao = (vJ1 > vJ2) ? "Jogador 1" : (vJ2 > vJ1 ? "Jogador 2" : (v1 !== "Empate" ? v1 : h[0][1]));
  }
  return { finalizado: fin, vencedorJogo: vMao, vencedorUltimaRodada: vMao || (vJ1 > vJ2 ? "Jogador 1" : "Jogador 2"), statusRodadas };
}

function finalizarRodada(v, pts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const placar = ss.getSheetByName("Placar");
  ss.getSheetByName("Mesa").getRange("F3").setValue("FIM");
  const cell = (v === "Jogador 1") ? "A2" : "B2";
  placar.getRange(cell).setValue((placar.getRange(cell).getValue() || 0) + pts);
}

function pedirAumento(n) { 
  const m = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Mesa");
  const v = parseInt(m.getRange("F4").getValue()) || 1;
  const nv = (v === 1) ? 3 : v + 3;
  if (nv > 12) return;
  m.getRange("F5").setValue("Jogador " + n + " pediu " + nv);
}

function responderDesafio(n, resp) {
  const m = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Mesa");
  const desafioStr = m.getRange("F5").getValue();
  if (resp === 'aceito') {
    const novoValor = parseInt(desafioStr.split(" ").pop());
    m.getRange("F4").setValue(novoValor);
    m.getRange("F5").setValue("Nenhum");
  } else {
    const vencedor = (parseInt(n) === 1) ? "Jogador 2" : "Jogador 1";
    const pts = parseInt(m.getRange("F4").getValue());
    m.getRange("F5").setValue("Nenhum");
    finalizarRodada(vencedor, pts);
  }
}

function getDadosIniciais(n) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mesa = ss.getSheetByName("Mesa");
  const statusMesa = mesa.getRange("F2:F5").getValues();
  const vira = statusMesa[0][0];
  const pts = ss.getSheetByName("Placar").getRange("A2:B2").getValues()[0] || [0,0];
  const hist = mesa.getRange("A2:C11").getValues().filter(r => r[1] !== "");
  const cartas = ss.getSheetByName("Dados").getRange(2, parseInt(n), 3).getValues().flat().filter(String);
  const analise = vira ? analisarPartida(hist, vira) : { statusRodadas: [] };
  return { 
    pronto: !!vira, cartas, vira, historico: hist, rodadas: analise.statusRodadas,
    vezDe: statusMesa[1][0], valor: statusMesa[2][0], 
    desafio: statusMesa[3][0], finalizado: statusMesa[1][0] === "FIM", 
    vencedorMao: statusMesa[1][0] === "FIM" ? analise.vencedorJogo : null, 
    placar: { j1: pts[0], j2: pts[1] } 
  };
}

function zerarTudo() {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Placar").getRange("A2:B2").setValues([[0, 0]]);
  prepararNovaMao();
}
