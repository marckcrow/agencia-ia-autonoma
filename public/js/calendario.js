/* Utilitários de calendário no navegador (sem dependências). */
window.Calendario = (function () {
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

  function iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function deISO(s) {
    const [a, m, d] = s.split('-').map(Number);
    return new Date(a, m - 1, d, 12, 0, 0);
  }

  function inicioDaSemana(dataISO) {
    const d = dataISO ? deISO(dataISO) : new Date();
    d.setHours(12, 0, 0, 0);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return d;
  }

  /** Reposiciona a grade de slots de uma semana em outra data de referência. */
  function deslocarSemana(semana, dataRefISO) {
    const inicioAntigo = deISO(semana.inicioSemana);
    const inicioNovo = inicioDaSemana(dataRefISO);
    const deltaDias = Math.round((inicioNovo - inicioAntigo) / 86400000);
    if (deltaDias === 0) return semana;

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioNovo);
      d.setDate(inicioNovo.getDate() + i);
      dias.push({ iso: iso(d), diaSemana: DIAS[d.getDay()], abreviado: ABREV[d.getDay()] });
    }

    const slots = semana.slots.map((s) => {
      const d = deISO(s.data);
      d.setDate(d.getDate() + deltaDias);
      const novoIso = iso(d);
      const dia = dias.find((x) => x.iso === novoIso);
      return Object.assign({}, s, {
        data: novoIso,
        diaSemana: dia ? dia.diaSemana : s.diaSemana,
        // conteúdo real só existe na semana registrada no banco
        status: s.conteudoId ? s.status : 'vazio',
      });
    });

    return Object.assign({}, semana, {
      inicioSemana: iso(inicioNovo),
      fimSemana: dias[6].iso,
      dias,
      slots,
    });
  }

  return { iso, deISO, inicioDaSemana, deslocarSemana, DIAS, ABREV };
})();
