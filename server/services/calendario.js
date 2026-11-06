/**
 * Serviço de calendário editorial.
 *
 * Responsabilidade única: transformar a configuração de slots dos canais em
 * ocorrências de calendário reais para uma semana de referência, casando com
 * os conteúdos que existem no banco.
 *
 * Um slot é uma OCORRÊNCIA ESPERADA do calendário. Ele NÃO representa um vídeo
 * produzido. O status de cada ocorrência vem exclusivamente do conteúdo real
 * vinculado a ela — sem conteúdo, o status é "vazio" (aguardando produção).
 */
'use strict';

const conteudosSvc = require('./conteudos');

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DIAS_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PLATAFORMAS = {
  youtube_shorts: 'YouTube Shorts',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
};

/** Segunda-feira da semana que contém `data`. */
function inicioDaSemana(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = domingo
  const deslocamento = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + deslocamento);
  return d;
}

/** Chave estável de um slot: canal + data + hora. */
function chaveSlot(canalId, dataISO, hora) {
  return `${canalId}|${dataISO}|${hora}`;
}

function isoData(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function gerarSemana(db, dataRef) {
  const inicio = inicioDaSemana(dataRef || new Date());
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    dias.push({ iso: isoData(d), diaSemana: DIAS_LABEL[d.getDay()], abreviado: DIAS[d.getDay()] });
  }

  const porChave = new Map();
  for (const c of db.conteudos || []) {
    if (!c.slot) continue;
    porChave.set(chaveSlot(c.canalId, c.slot.data, c.slot.hora), c);
  }

  const slots = [];
  for (const canal of db.canais) {
    for (const s of canal.slots) {
      const dia = dias[s.dia === 0 ? 6 : s.dia - 1];
      const conteudo = porChave.get(chaveSlot(canal.id, dia.iso, s.hora)) || null;
      slots.push({
        chave: chaveSlot(canal.id, dia.iso, s.hora),
        canalId: canal.id,
        canalNome: canal.nome,
        canalCor: canal.cor,
        data: dia.iso,
        diaSemana: dia.diaSemana,
        hora: s.hora,
        plataformas: canal.plataformas,
        status: conteudo ? conteudo.status : 'vazio',
        prontoParaPublicar: conteudo ? conteudosSvc.podePublicar(conteudo) : false,
        conteudoId: conteudo ? conteudo.id : null,
        titulo: conteudo ? conteudo.titulo : null,
      });
    }
  }

  slots.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  return {
    inicioSemana: isoData(inicio),
    fimSemana: dias[6].iso,
    dias,
    slots,
    plataformas: PLATAFORMAS,
  };
}

/* ------------------------- vínculo conteúdo ↔ slot ------------------------- */

/** Dia da semana no padrão do projeto: 0=domingo, 1=segunda ... 6=sábado. */
function diaDaSemana(dataISO) {
  const d = new Date(`${dataISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getDay();
}

function dataValida(dataISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataISO || ''))) return false;
  const d = new Date(`${dataISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === dataISO;
}

/**
 * Vincula um conteúdo já aprovado a um slot do calendário editorial.
 * Regras: o slot precisa existir na grade do canal, um slot aceita um
 * conteúdo por vez e só conteúdo aprovado pode ser agendado.
 */
function agendar(db, conteudoId, { data, hora }) {
  const conteudo = (db.conteudos || []).find((c) => c.id === conteudoId);
  if (!conteudo) throw Object.assign(new Error('Conteúdo não encontrado'), { status: 404 });

  if (!conteudosSvc.podeAgendar(conteudo)) {
    throw Object.assign(
      new Error('Só conteúdo aprovado pela Direção pode ser agendado no calendário.'),
      { status: 409 }
    );
  }

  if (!dataValida(data)) {
    throw Object.assign(new Error('Data inválida. Use o formato AAAA-MM-DD.'), { status: 400 });
  }
  const horaLimpa = String(hora || '').trim();
  if (!/^\d{2}:\d{2}$/.test(horaLimpa)) {
    throw Object.assign(new Error('Hora inválida. Use o formato HH:MM.'), { status: 400 });
  }

  const canal = (db.canais || []).find((c) => c.id === conteudo.canalId);
  if (!canal) throw Object.assign(new Error('Canal inexistente'), { status: 400 });

  const dia = diaDaSemana(data);
  const existeNaGrade = (canal.slots || []).some((s) => s.dia === dia && s.hora === horaLimpa);
  if (!existeNaGrade) {
    throw Object.assign(
      new Error(`Slot inexistente na grade do canal ${canal.nome} (${data} ${horaLimpa}).`),
      { status: 400 }
    );
  }

  const ocupado = (db.conteudos || []).find(
    (c) => c.id !== conteudoId && c.slot
      && c.slot.canalId === canal.id && c.slot.data === data && c.slot.hora === horaLimpa
  );
  if (ocupado) {
    throw Object.assign(
      new Error(`Slot já ocupado por "${ocupado.titulo}".`),
      { status: 409 }
    );
  }

  conteudo.slot = {
    canalId: canal.id,
    data,
    hora: horaLimpa,
    vinculadoEm: new Date().toISOString(),
  };
  conteudo.atualizadoEm = new Date().toISOString();
  db.historico = db.historico || [];
  db.historico.push({
    em: conteudo.atualizadoEm,
    tipo: 'agendamento',
    conteudoId: conteudo.id,
    texto: `Conteúdo agendado no slot ${data} ${horaLimpa} (${canal.nome}): "${conteudo.titulo}".`,
  });
  return conteudo;
}

/** Libera o slot do conteúdo (não apaga o conteúdo nem a decisão). */
function desagendar(db, conteudoId) {
  const conteudo = (db.conteudos || []).find((c) => c.id === conteudoId);
  if (!conteudo) throw Object.assign(new Error('Conteúdo não encontrado'), { status: 404 });
  if (!conteudo.slot) {
    throw Object.assign(new Error('Este conteúdo não está agendado.'), { status: 409 });
  }
  const anterior = conteudo.slot;
  conteudo.slot = null;
  conteudo.atualizadoEm = new Date().toISOString();
  db.historico = db.historico || [];
  db.historico.push({
    em: conteudo.atualizadoEm,
    tipo: 'agendamento',
    conteudoId: conteudo.id,
    texto: `Slot liberado (${anterior.data} ${anterior.hora}): "${conteudo.titulo}".`,
  });
  return conteudo;
}

module.exports = { gerarSemana, inicioDaSemana, isoData, chaveSlot, PLATAFORMAS, agendar, desagendar, diaDaSemana };
