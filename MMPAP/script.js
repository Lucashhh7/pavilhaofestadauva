const SUPABASE_URL = 'https://kfshysqaizbxfgftvysj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFv8ZavR5c845HbSY492zw_VeZL9J1e';
  const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const imgWidth = 8000;  
  const imgHeight = 2880; 
  const imgUrl = '../img/planta2.png';
  const bounds = [[0, 0], [imgHeight, imgWidth]];

  let isSomenteLeitura = true;
  const emailsAdministradores = [
    "tauamdente1998@gmail.com"
  ];

  const map = L.map('map', {
    crs: L.CRS.Simple,
    maxZoom: 5,
    minZoom: -2,
    zoomSnap: 0,
    zoomDelta: 0.2,
    wheelPxPerZoomLevel: 120,
    wheelDebounceTime: 40,
    zoomAnimation: true,
    zoomAnimationThreshold: 4,
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 3000,
    inertiaMaxSpeed: 3000,
    easeLinearity: 0.2
  });

  const imageOverlay = L.imageOverlay(imgUrl, bounds).addTo(map);
  imageOverlay.on('error', function() {
    console.error("Erro crítico: A imagem da planta em '" + imgUrl + "' não pôde ser carregada.");
    alert("Atenção: A imagem de fundo da planta ('planta2.png') não foi encontrada no caminho '../img/planta2.png'.");
  });

  map.fitBounds(bounds);

  let tempMarker = null;
  let tipoSelecionado = null;
  let usuarioLogado = null;
  let equipamentosCache = {};
  let camadaMarkers = L.layerGroup().addTo(map);
  let flagRemoverFoto = false;

  let listaUrlsFotosAtuais = [];

  const iconeNeon = L.divIcon({ className: 'custom-pin', iconSize: [14, 14], iconAnchor: [7, 7] });

  const iconesAP = {
    'ap_indoor': L.icon({ iconUrl: '../icon/aprw.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-green' }),
    'ap_outdoor': L.icon({ iconUrl: '../icon/quadrado.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-green' }),
    'ap_omni': L.icon({ iconUrl: '../icon/apbola.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-green' }),
    'ap_ptp': L.icon({ iconUrl: '../icon/unifi.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-green' })
  };

  const iconeRack = L.icon({ iconUrl: '../icon/rack.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-blue' });
  const iconeSwitch = L.icon({ iconUrl: '../icon/switch.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-cyan' });
  const iconeRoteador = L.icon({ iconUrl: '../icon/roteador.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-orange' });
  const iconeOutro = L.icon({ iconUrl: '../icon/outro.png', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16], className: 'led-glow-green' });

  function alternarCamposAP() {
    const tipo = document.getElementById('tipo_equipamento').value;
    const groupModelo = document.getElementById('group-modelo-ap');
    groupModelo.style.display = (tipo === 'AP') ? 'block' : 'none';
  }

  function aplicarRegrasDePermissao() {
    const tagModo = document.getElementById('tag-modo-exibicao');
    const blocoFormURack = document.getElementById('bloco-form-u-rack');
    const blocoFormExtraRack = document.getElementById('bloco-form-extra-rack');

    if (isSomenteLeitura) {
      document.querySelectorAll('#top-bar .tool-btn').forEach(btn => btn.style.display = 'none');
      tagModo.innerText = '👁️ Modo Leitura';
      tagModo.style.background = '#475569';
      if(blocoFormURack) blocoFormURack.style.display = 'none';
      if(blocoFormExtraRack) blocoFormExtraRack.style.display = 'none';
    } else {
      document.querySelectorAll('#top-bar .tool-btn').forEach(btn => btn.style.display = 'flex');
      tagModo.innerText = '🛡️ Administrador';
      tagModo.style.background = '#16a34a';
      if(blocoFormURack) blocoFormURack.style.display = 'block';
      if(blocoFormExtraRack) blocoFormExtraRack.style.display = 'block';
    }
  }

  async function checarSessaoInicial() {
    try {
      const { data: { session }, error } = await _supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        usuarioLogado = session.user;
        isSomenteLeitura = !emailsAdministradores.includes(usuarioLogado.email);
        
        aplicarRegrasDePermissao();
        document.getElementById('login-overlay').style.display = 'none';
        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds);
        }, 200);
        carregarEquipamentos();
      } else {
        document.getElementById('login-overlay').style.display = 'flex';
      }
    } catch (err) {
      console.error("Erro na sessão:", err);
      document.getElementById('login-overlay').style.display = 'flex';
    }
  }

  document.getElementById('form-login-inicial').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;
    const divErro = document.getElementById('login-erro');
    const btn = document.getElementById('btn-login-submit');

    divErro.style.display = 'none';
    btn.disabled = true;
    btn.innerText = 'Autenticando...';

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
      divErro.innerText = 'E-mail ou senha inválidos.';
      divErro.style.display = 'block';
      btn.disabled = false;
      btn.innerText = 'Entrar no Sistema';
    } else {
      usuarioLogado = data.user;
      isSomenteLeitura = !emailsAdministradores.includes(usuarioLogado.email);

      aplicarRegrasDePermissao();
      document.getElementById('login-overlay').style.display = 'none';
      setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds);
      }, 200);
      carregarEquipamentos();
    }
  });

  async function fazerLogout() {
    await _supabase.auth.signOut();
    location.reload();
  }

  function selecionarTipo(tipo, btnElement) {
    if (isSomenteLeitura) return;
    if (tipoSelecionado === tipo) { tipoSelecionado = null; btnElement.classList.remove('active'); } 
    else { tipoSelecionado = tipo; document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active')); btnElement.classList.add('active'); }
  }

  function abrirModalNovo() {
    if (isSomenteLeitura) return;
    document.getElementById('form-equipamento').reset();
    document.getElementById('equipamento_id').value = '';
    document.getElementById('tipo_equipamento').value = tipoSelecionado || 'AP';
    document.getElementById('preview-container-foto').style.display = 'none';
    document.getElementById('foto').style.display = 'block';
    
    listaUrlsFotosAtuais = [];
    const galeria = document.getElementById('galeria-fotos');
    if(galeria) galeria.innerHTML = '';
    const btnAbrirTodas = document.getElementById('btn-abrir-todas-fotos');
    if(btnAbrirTodas) btnAbrirTodas.style.display = 'none';

    flagRemoverFoto = false;
    alternarCamposBloqueio(false);

    document.getElementById('modal-titulo').innerText = `Cadastrar ${tipoSelecionado || 'Equipamento'}`;
    document.getElementById('btn-submit-form').innerText = 'Salvar no Supabase';
    document.getElementById('btn-submit-form').style.display = 'block';
    alternarCamposAP();
    document.getElementById('modal-cadastro').style.display = 'flex';
  }

  function editarEquipamento(id) {
    if (isSomenteLeitura) return;
    preencherDadosModal(id);
    alternarCamposBloqueio(false);

    document.getElementById('modal-titulo').innerText = `Editar Equipamento #${id}`;
    document.getElementById('btn-submit-form').innerText = 'Atualizar Alterações';
    document.getElementById('btn-submit-form').style.display = 'block';
    document.getElementById('foto').style.display = 'block';
    document.getElementById('container-btn-excluir-foto').style.display = 'flex';
    document.getElementById('modal-cadastro').style.display = 'flex';
  }

  function verDetalhesEquipamento(id) {
    preencherDadosModal(id);
    alternarCamposBloqueio(true);

    document.getElementById('modal-titulo').innerText = `Detalhes do Equipamento #${id}`;
    document.getElementById('btn-submit-form').style.display = 'none';
    document.getElementById('foto').style.display = 'none';
    document.getElementById('container-btn-excluir-foto').style.display = 'none';
    document.getElementById('modal-cadastro').style.display = 'flex';
  }

  async function carregarFotosAdicionais(equipamentoId) {
    const galeria = document.getElementById('galeria-fotos');
    const btnAbrirTodas = document.getElementById('btn-abrir-todas-fotos');
    if (!galeria) return;

    galeria.innerHTML = '';
    if (!equipamentoId) return;

    const { data, error } = await _supabase
      .from('equipamento_fotos')
      .select('id, foto_url, nome_arquivo, created_at')
      .eq('equipamento_id', equipamentoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Fotos adicionais não carregadas:', error.message);
      return;
    }

    if (data && data.length > 0) {
      data.forEach((foto) => {
        if (!listaUrlsFotosAtuais.includes(foto.foto_url)) {
          listaUrlsFotosAtuais.push(foto.foto_url);
        }

        const card = document.createElement('div');
        card.style.cssText = 'position:relative; border:1px solid #555; border-radius:6px; padding:4px; background:#1e293b;';

        const img = document.createElement('img');
        img.src = foto.foto_url;
        img.alt = foto.nome_arquivo || 'Foto';
        img.style.cssText = 'width:100%; height:90px; object-fit:cover; border-radius:4px; cursor:pointer;';
        img.onclick = () => window.open(foto.foto_url, '_blank');

        if (!isSomenteLeitura) {
          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.innerHTML = '&times;';
          btnDel.style.cssText = 'position:absolute; top:2px; right:4px; background:rgba(255,82,82,0.9); color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center;';
          btnDel.title = 'Excluir esta foto';
          btnDel.onclick = async (ev) => {
            ev.stopPropagation();
            if (confirm('Deseja excluir esta foto da galeria?')) {
              await deletarFotoIndividual(foto.id, foto.foto_url, equipamentoId);
            }
          };
          card.appendChild(btnDel);
        }

        card.appendChild(img);
        galeria.appendChild(card);
      });
    }

    if (btnAbrirTodas) {
      btnAbrirTodas.style.display = listaUrlsFotosAtuais.length > 0 ? 'inline-block' : 'none';
    }
  }

  async function salvarFotosAdicionais(equipamentoId, arquivos) {
    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `extra_${equipamentoId}_${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await _supabase.storage.from('fotos').upload(fileName, arquivo);
      if (uploadError) {
        console.error("Erro no upload da foto extra:", uploadError);
        continue;
      }

      const { data: publicUrlData } = _supabase.storage.from('fotos').getPublicUrl(fileName);
      const fotoUrl = publicUrlData.publicUrl;

      const { error: dbError } = await _supabase.from('equipamento_fotos').insert([{
        equipamento_id: equipamentoId,
        foto_url: fotoUrl,
        nome_arquivo: arquivo.name
      }]);

      if (dbError) {
        console.error("Erro ao salvar referência da foto no banco:", dbError);
      } else {
        mostrarNotificacaoVisual(`Foto ${i + 1} salva com sucesso!`);
      }
    }
  }

  function mostrarNotificacaoVisual(mensagem) {
    let toast = document.getElementById('toast-feedback');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-feedback';
      toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #10B981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 99999; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.innerText = mensagem;
    toast.style.opacity = '1';
    
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 3000);
  }

  // Evento de submit do formulário principal
  document.getElementById('form-equipamento').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (typeof isSomenteLeitura !== 'undefined' && isSomenteLeitura) return;

    const id = document.getElementById('equipamento_id').value;
    const tipo = document.getElementById('tipo_equipamento').value;
    const modelo_ap = document.getElementById('modelo_ap').value;
    const nome = document.getElementById('nome').value;
    const mac = document.getElementById('mac').value;
    const sn = document.getElementById('sn').value;
    const fabricante = document.getElementById('fabricante').value;
    const modelo = document.getElementById('modelo').value;
    const pos_x = parseFloat(document.getElementById('pos_x').value);
    const pos_y = parseFloat(document.getElementById('pos_y').value);
    
    const arquivosInput = document.getElementById('foto').files;

    let foto_url = id && equipamentosCache[id] ? equipamentosCache[id].foto_url : null;

    if (flagRemoverFoto && foto_url) {
      const caminho = obterCaminhoStorageDaUrl(foto_url);
      if (caminho) await _supabase.storage.from('fotos').remove([caminho]);
      foto_url = null;
    }

    try {
      let startIndexExtras = 0;

      if (arquivosInput && arquivosInput.length > 0) {
        if (!foto_url) {
          const arquivoPrincipal = arquivosInput[0];
          const ext = (arquivoPrincipal.name.split('.').pop() || 'jpg').toLowerCase();
          const fileName = `equip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

          const { error: uploadError } = await _supabase.storage.from('fotos').upload(fileName, arquivoPrincipal);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = _supabase.storage.from('fotos').getPublicUrl(fileName);
          foto_url = publicUrlData.publicUrl;
          startIndexExtras = 1;
        }
      }

      let equipamentoIdSalvo = id;

      if (id) {
        const { error } = await _supabase.from('equipamentos').update({
          tipo, 
          modelo_ap: tipo === 'AP' ? modelo_ap : null, 
          nome, 
          mac_address: mac, 
          serial_number: sn, 
          fabricante, 
          modelo, 
          foto_url, 
          posicao_x: pos_x, 
          posicao_y: pos_y
        }).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await _supabase.from('equipamentos').insert([{
          tipo, 
          modelo_ap: tipo === 'AP' ? modelo_ap : null, 
          nome, 
          mac_address: mac, 
          serial_number: sn, 
          fabricante, 
          modelo, 
          foto_url, 
          posicao_x: pos_x, 
          posicao_y: pos_y
        }]).select();
        if (error) throw error;
        if (data && data.length > 0) equipamentoIdSalvo = data[0].id;
      }

      if (arquivosInput && arquivosInput.length > startIndexExtras) {
        const arquivosExtras = Array.from(arquivosInput).slice(startIndexExtras);
        await salvarFotosAdicionais(equipamentoIdSalvo, arquivosExtras);
      }

      fecharModal();
      carregarEquipamentos();

    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar: " + (err.message || JSON.stringify(err)));
    }
  });

  async function deletarFotoIndividual(fotoId, fotoUrl, equipamentoId) {
    try {
      const caminho = obterCaminhoStorageDaUrl(fotoUrl);
      if (caminho) {
        await _supabase.storage.from('fotos').remove([caminho]);
      }
      const { error } = await _supabase.from('equipamento_fotos').delete().eq('id', fotoId);
      if (error) throw error;

      await carregarFotosAdicionais(equipamentoId);
    } catch (err) {
      console.error("Erro ao excluir foto extra:", err);
      alert("Erro ao excluir foto: " + err.message);
    }
  }

  function obterCaminhoStorageDaUrl(url) {
    try {
      const parte = '/storage/v1/object/public/fotos/';
      const index = url.indexOf(parte);
      if (index !== -1) {
        return decodeURIComponent(url.substring(index + parte.length));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function abrirTodasAsFotos() {
    if (listaUrlsFotosAtuais && listaUrlsFotosAtuais.length > 0) {
      listaUrlsFotosAtuais.forEach(url => window.open(url, '_blank'));
    }
  }

  function alternarCamposBloqueio(bloquear) {
    const campos = ['tipo_equipamento', 'modelo_ap', 'nome', 'mac', 'sn', 'fabricante', 'modelo'];
    campos.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = bloquear;
    });
  }

  function fecharModal() {
    document.getElementById('modal-cadastro').style.display = 'none';
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
  }

  function fecharModalRack() {
    document.getElementById('modal-rack').style.display = 'none';
  }

  function removerFotoAtual() {
    flagRemoverFoto = true;
    document.getElementById('preview-container-foto').style.display = 'none';
  }

  async function preencherDadosModal(id) {
    const eq = equipamentosCache[id];
    if (!eq) return;

    document.getElementById('equipamento_id').value = eq.id;
    document.getElementById('tipo_equipamento').value = eq.tipo || 'AP';
    document.getElementById('modelo_ap').value = eq.modelo_ap || 'ap_indoor';
    document.getElementById('nome').value = eq.nome || '';
    document.getElementById('mac').value = eq.mac_address || '';
    document.getElementById('sn').value = eq.serial_number || '';
    document.getElementById('fabricante').value = eq.fabricante || '';
    document.getElementById('modelo').value = eq.modelo || '';
    document.getElementById('pos_x').value = eq.posicao_x || '';
    document.getElementById('pos_y').value = eq.posicao_y || '';

    listaUrlsFotosAtuais = [];
    if (eq.foto_url) {
      listaUrlsFotosAtuais.push(eq.foto_url);
      document.getElementById('img-foto-atual').src = eq.foto_url;
      document.getElementById('link-foto-atual').href = eq.foto_url;
      document.getElementById('preview-container-foto').style.display = 'block';
    } else {
      document.getElementById('preview-container-foto').style.display = 'none';
    }

    flagRemoverFoto = false;
    alternarCamposAP();

    await carregarFotosAdicionais(id);
  }

  async function carregarEquipamentos() {
    const { data, error } = await _supabase.from('equipamentos').select('*');
    if (error) {
      console.error('Erro ao buscar equipamentos:', error);
      return;
    }

    camadaMarkers.clearLayers();
    equipamentosCache = {};

    data.forEach(item => {
      equipamentosCache[item.id] = item;
      adicionarMarcadorMapa(item);
    });
  }

  function adicionarMarcadorMapa(item) {
    let iconeFinal = iconeNeon;
    if (item.tipo === 'AP') {
      iconeFinal = iconesAP[item.modelo_ap] || iconesAP['ap_indoor'];
    } else if (item.tipo === 'Rack') {
      iconeFinal = iconeRack;
    } else if (item.tipo === 'Switch') {
      iconeFinal = iconeSwitch;
    } else if (item.tipo === 'Roteador') {
      iconeFinal = iconeRoteador;
    } else if (item.tipo === 'Outro') {
      iconeFinal = iconeOutro;
    }

    const marker = L.marker([item.posicao_y, item.posicao_x], { 
      icon: iconeFinal,
      draggable: !isSomenteLeitura 
    });

    let conteudoPopup = `
      <div style="color: #000; min-width: 180px;">
        <strong style="font-size: 1rem; color: #111;">${item.nome || 'Sem Nome'}</strong><br>
        <span style="font-size: 0.8rem; color: #555;">Tipo: ${item.tipo}</span><br>
        <span style="font-size: 0.8rem; color: #555;">MAC: ${item.mac_address || 'N/A'}</span><br>
        <button class="popup-btn" onclick="verDetalhesEquipamento(${item.id})">🔍 Ver Detalhes</button>
    `;

    if (!isSomenteLeitura) {
      conteudoPopup += `
        <button class="popup-edit-btn" onclick="editarEquipamento(${item.id})">✏️ Editar</button>
        <button class="popup-delete-btn" onclick="deletarEquipamento(${item.id})">🗑️ Excluir</button>
      `;
    }

    if (item.tipo === 'Rack') {
      conteudoPopup += `<button class="popup-btn" style="background:#8e44ad;" onclick="abrirModalRack(${item.id}, '${item.nome}')">🗄️ Abrir Rack</button>`;
    }

    conteudoPopup += `</div>`;

    marker.bindPopup(conteudoPopup);

    if (!isSomenteLeitura) {
      marker.on('dragend', async function(e) {
        const novaPos = e.target.getLatLng();
        await _supabase.from('equipamentos').update({
          posicao_x: novaPos.lng,
          posicao_y: novaPos.lat
        }).eq('id', item.id);
        
        item.posicao_x = novaPos.lng;
        item.posicao_y = novaPos.lat;
      });
    }

    camadaMarkers.addLayer(marker);
  }

  map.on('click', function(e) {
    if (isSomenteLeitura || !tipoSelecionado) return;

    if (tempMarker) map.removeLayer(tempMarker);

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    tempMarker = L.marker([lat, lng], { icon: iconeNeon }).addTo(map);

    abrirModalNovo();
    document.getElementById('pos_x').value = lng;
    document.getElementById('pos_y').value = lat;
  });

  async function deletarEquipamento(id) {
    if (isSomenteLeitura) return;
    if (!confirm('Deseja realmente excluir este equipamento e todas as fotos associadas?')) return;

    const item = equipamentosCache[id];
    if (item && item.foto_url) {
      const caminho = obterCaminhoStorageDaUrl(item.foto_url);
      if (caminho) await _supabase.storage.from('fotos').remove([caminho]);
    }

    const { data: fotosExtras } = await _supabase.from('equipamento_fotos').select('foto_url').eq('equipamento_id', id);
    if (fotosExtras) {
      for (const f of fotosExtras) {
        const cam = obterCaminhoStorageDaUrl(f.foto_url);
        if (cam) await _supabase.storage.from('fotos').remove([cam]);
      }
    }

    await _supabase.from('equipamentos').delete().eq('id', id);
    carregarEquipamentos();
  }

  async function abrirModalRack(equipId, equipNome) {
    document.getElementById('rack_id_atual').value = equipId;
    document.getElementById('rack-titulo').innerText = `Visualização do Rack: ${equipNome}`;
    document.getElementById('modal-rack').style.display = 'flex';
    await carregarItensRack(equipId);
  }

  async function carregarItensRack(equipId) {
    const frame = document.getElementById('rack-frame');
    if (!frame) return;
    frame.innerHTML = '';

    const { data, error } = await _supabase.from('rack_itens').select('*').eq('rack_id', equipId);
    if (error) {
      console.error('Erro ao carregar itens do rack:', error);
      return;
    }

    const ocupados = {};
    if (data) {
      data.forEach(item => {
        for (let i = 0; i < (item.tamanho_u || 1); i++) {
          ocupados[item.posicao_u + i] = item;
        }
      });
    }

    for (let u = 44; u >= 1; u--) {
      const slot = document.createElement('div');
      slot.className = 'rack-u-slot';
      
      if (ocupados[u]) {
        const item = ocupados[u];
        slot.classList.add('occupied');
        slot.innerHTML = `<span>U${u}: ${item.nome} (${item.tipo})</span>`;
        if (!isSomenteLeitura) {
          const btnRemover = document.createElement('button');
          btnRemover.innerHTML = '&times;';
          btnRemover.style.cssText = 'background:none; border:none; color:#fff; cursor:pointer; font-size:1rem; font-weight:bold;';
          btnRemover.onclick = async () => {
            if (confirm(`Remover ${item.nome} do rack?`)) {
              await _supabase.from('rack_itens').delete().eq('id', item.id);
              carregarItensRack(equipId);
            }
          };
          slot.appendChild(btnRemover);
        }
      } else {
        slot.innerHTML = `<span>U${u}</span> <span style="color:#444;">Vago</span>`;
      }
      frame.appendChild(slot);
    }
  }

  // Correção do evento do form de item de rack que estava cortado
  const formItemRack = document.getElementById('form-item-rack');
  if (formItemRack) {
    formItemRack.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (isSomenteLeitura) return;

      const rack_id = document.getElementById('rack_id_atual').value;
      const nome = document.getElementById('rack_item_nome').value;
      const tipo = document.getElementById('rack_item_tipo').value;
      const posicao_u = parseInt(document.getElementById('rack_item_u').value);
      const tamanho_u = parseInt(document.getElementById('rack_item_tamanho').value || 1);

      const { error } = await _supabase.from('rack_itens').insert([{
        rack_id,
        nome,
        tipo,
        posicao_u,
        tamanho_u
      }]);

      if (error) {
        alert("Erro ao adicionar item no rack: " + error.message);
      } else {
        formItemRack.reset();
        carregarItensRack(rack_id);
      }
    });
  }