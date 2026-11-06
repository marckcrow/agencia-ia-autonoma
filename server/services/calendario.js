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

module.exports = { gerarSemana, inicioDaSemana, isoData, chaveSlot, PLATAFORMAS };
