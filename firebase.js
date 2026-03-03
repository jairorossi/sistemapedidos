// ==========================================
// firebase.js - Configuração e funções do Firebase
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, doc, updateDoc, deleteDoc, runTransaction, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBb8UGRV8qcjV6-_kd7WucWhoJBKSHcUac",
    authDomain: "mpleaoerp.firebaseapp.com",
    projectId: "mpleaoerp",
    storageBucket: "mpleaoerp.firebasestorage.app",
    messagingSenderId: "806362757682",
    appId: "1:806362757682:web:3cefbea0483af0ef251a2b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// SEGURANÇA: Configura o login para expirar ao fechar o navegador
setPersistence(auth, browserSessionPersistence)
    .then(() => {
        console.log("🔐 Segurança: Sessão limitada ao navegador.");
    })
    .catch((error) => {
        console.error("Erro na persistência:", error);
    });

// ==========================================
// EXPORTA FUNÇÕES DO FIREBASE PARA USO GLOBAL
// ==========================================
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.serverTimestamp = serverTimestamp;
window.getDocs = getDocs;
window.doc = doc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.runTransaction = runTransaction;
window.writeBatch = writeBatch;

// ==========================================
// PROTEÇÃO DE ACESSO
// ==========================================
let loginVerificado = false;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace('login.html');
    } else {
        localStorage.setItem('userLogged', 'true');
        if (!loginVerificado) {
            loginVerificado = true;
            carregarMemoriaBanco();
        }
    }
});

window.fazerLogout = function() {
    signOut(auth).then(() => window.location.replace('login.html'));
};

// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================
window.bancoClientes = []; 
window.bancoProdutos = []; 
window.bancoPedidos = [];
window.bancoParcelas = [];

// ==========================================
// FUNÇÃO DE VERIFICAÇÃO DE LIMITE DE CRÉDITO
// ==========================================
window.verificarLimiteCredito = function(clienteNome, valorNovoPedido) {
    const cliente = window.bancoClientes.find(c => c.nome === clienteNome);
    if (!cliente || !cliente.limite || parseFloat(cliente.limite) <= 0) return true;

    const limiteMaximo = parseFloat(cliente.limite);
    
    // Soma parcelas pendentes do cliente carregadas na memória
    const debitoPendente = window.bancoParcelas
        .filter(p => p.cliente === clienteNome && p.status === 'pendente')
        .reduce((total, p) => total + (parseFloat(p.valor) || 0), 0);

    const totalAcumulado = debitoPendente + valorNovoPedido;

    if (totalAcumulado > limiteMaximo) {
        Swal.fire({
            icon: 'error',
            title: 'Limite de Crédito Excedido',
            html: `
                <div class="text-left text-sm">
                    <p>O cliente <b>${clienteNome}</b> atingiu o limite.</p>
                    <p>Limite total: ${window.formatarValorReais(limiteMaximo)}</p>
                    <p>Débito atual pendente: ${window.formatarValorReais(debitoPendente)}</p>
                    <hr class="my-2">
                    <p class="text-red-600 font-bold">Total com este pedido: ${window.formatarValorReais(totalAcumulado)}</p>
                </div>
            `,
            confirmButtonColor: '#ef4444'
        });
        return false;
    }
    return true;
};

// ==========================================
// FUNÇÕES DE CEP
// ==========================================
window.buscarCEPCadastro = async function() {
    const inputCEP = document.getElementById('cli-cep');
    const statusEl = document.getElementById('cep-status-cadastro');
    const cep = inputCEP.value.replace(/\D/g, '');
    
    if (cep.length !== 8) {
        statusEl.innerHTML = '⚠️ CEP inválido (deve ter 8 dígitos)';
        statusEl.className = 'text-xs mt-1 text-red-600';
        return;
    }
    
    statusEl.innerHTML = '🔍 Consultando...';
    statusEl.className = 'text-xs mt-1 text-blue-600';
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (data.erro) {
            statusEl.innerHTML = '❌ CEP não encontrado';
            statusEl.className = 'text-xs mt-1 text-red-600';
            return;
        }
        
        let enderecoCompleto = data.logradouro || '';
        if (data.bairro) enderecoCompleto += `, ${data.bairro}`;
        enderecoCompleto += ` - ${data.localidade}/${data.uf}`;
        
        document.getElementById('cli-endereco').value = enderecoCompleto;
        
        statusEl.innerHTML = `✅ Endereço encontrado!`;
        statusEl.className = 'text-xs mt-1 text-green-600';
        
    } catch (error) {
        console.error('Erro na consulta de CEP:', error);
        statusEl.innerHTML = '❌ Erro ao consultar CEP';
        statusEl.className = 'text-xs mt-1 text-red-600';
    }
};

// ==========================================
// FUNÇÃO PARA CARREGAR DADOS DO CLIENTE
// ==========================================
window.carregarDadosCliente = function() {
    const selectCliente = document.getElementById('input-cliente');
    const nomeCliente = selectCliente ? selectCliente.value : '';
    
    const cliente = window.bancoClientes.find(c => c.nome === nomeCliente);
    
    const container = document.getElementById('dados-cliente-container');
    const telefoneSpan = document.getElementById('cliente-telefone');
    const documentoSpan = document.getElementById('cliente-documento');
    const enderecoSpan = document.getElementById('cliente-endereco');
    const cepSpan = document.getElementById('cliente-cep');
    const inputEndereco = document.getElementById('input-endereco');
    
    if (cliente) {
        container.classList.remove('hidden');
        telefoneSpan.innerText = cliente.telefone || '-';
        documentoSpan.innerText = cliente.documento || '-';
        enderecoSpan.innerText = cliente.endereco || '-';
        
        let cep = cliente.cep || '-';
        cepSpan.innerText = cep;
        
        inputEndereco.value = cliente.endereco || '';
        
        calcularTudo();
    } else {
        container.classList.add('hidden');
        inputEndereco.value = '';
    }
};

// ==========================================
// FUNÇÕES DE PRODUTO
// ==========================================
window.preencherProduto = function(select) {
    if (!select) return;
    
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) return;
    
    const valor = selectedOption.dataset.valor;
    const fornecedor = selectedOption.dataset.forn;
    
    const tr = select.closest('tr');
    if (!tr) return;
    
    const valorItem = tr.querySelector('.valor-item');
    const fornItem = tr.querySelector('.forn-item');
    const spanCodigo = tr.querySelector('.codigo-badge');
    
    const produtoEncontrado = window.bancoProdutos.find(p => p.descricao === selectedOption.value);
    if (spanCodigo) spanCodigo.innerText = produtoEncontrado ? produtoEncontrado.codigo : '---';

    if (valorItem) {
        valorItem.value = window.formatarValorReais(parseFloat(valor));
    }
    if (fornItem) {
        fornItem.value = fornecedor || '';
    }
    
    window.calcularTudo();
};

// ==========================================
// FUNÇÕES FINANCEIRAS
// ==========================================
window.atualizarParcelas = function() {
    const condicao = document.getElementById('select-condicao-pagamento').value;
    const divPersonalizado = document.getElementById('div-parcelas-personalizado');
    
    if (condicao === 'Personalizado') {
        divPersonalizado.classList.remove('hidden');
    } else {
        divPersonalizado.classList.add('hidden');
    }
};

async function gerarParcelas(pedidoId, clienteNome, valorTotal, condicao, primeiroVencimento) {
    let numeroParcelas = 1;
    
    if (condicao === 'Vista') {
        numeroParcelas = 1;
    } else if (condicao === 'Personalizado') {
        numeroParcelas = parseInt(document.getElementById('input-parcelas')?.value) || 1;
    } else {
        numeroParcelas = parseInt(condicao.replace('x', '')) || 1;
    }
    
    const valorParcela = valorTotal / numeroParcelas;
    
    let dataVencimento = primeiroVencimento ? new Date(primeiroVencimento + 'T12:00:00') : new Date();
    
    for (let i = 0; i < numeroParcelas; i++) {
        const vencimento = new Date(dataVencimento);
        vencimento.setMonth(vencimento.getMonth() + i);
        
        const parcela = {
            pedidoId: pedidoId,
            cliente: clienteNome,
            numeroParcela: i+1,
            totalParcelas: numeroParcelas,
            vencimento: vencimento.toISOString().split('T')[0],
            valor: valorParcela,
            status: 'pendente',
            dataPagamento: null,
            dataCriacao: new Date().toISOString()
        };
        
        try {
            await addDoc(collection(db, "parcelas"), parcela);
        } catch (error) {
            console.error('Erro ao salvar parcela:', error);
        }
    }
}

window.receberParcela = async function(parcelaId) {
    const result = await Swal.fire({
        title: 'Confirmar recebimento',
        text: 'Deseja marcar esta parcela como recebida?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, receber',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const parcelaRef = doc(db, "parcelas", parcelaId);
        await updateDoc(parcelaRef, {
            status: 'pago',
            dataPagamento: new Date().toISOString().split('T')[0]
        });
        
        await Swal.fire({
            icon: 'success',
            title: 'Recebido!',
            text: 'Parcela marcada como paga com sucesso.',
            timer: 2000,
            showConfirmButton: false
        });
        
        await carregarParcelasDoFirebase();
        window.carregarDadosFinanceiros();
        
    } catch (error) {
        console.error('Erro ao receber parcela:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao registrar pagamento!',
            confirmButtonColor: '#3b82f6'
        });
    }
};

async function carregarParcelasDoFirebase() {
    try {
        const parcelasSnap = await getDocs(collection(db, "parcelas"));
        window.bancoParcelas = parcelasSnap.docs.map(doc => ({ 
            firebaseId: doc.id,
            ...doc.data() 
        }));
        
        console.log(`📊 ${window.bancoParcelas.length} parcelas carregadas`);
        
    } catch (error) {
        console.error('Erro ao carregar parcelas:', error);
        window.bancoParcelas = [];
    }
}

window.carregarDadosFinanceiros = async function() {
    await carregarParcelasDoFirebase();
    
    let totalReceber = 0;
    let totalVencer = 0;
    let totalAtrasado = 0;
    let totalRecebidoMes = 0;
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    const valoresPorMes = [0, 0, 0, 0, 0, 0];
    
    window.bancoParcelas.forEach(parcela => {
        const valor = parseFloat(parcela.valor) || 0;
        const vencimento = new Date(parcela.vencimento + 'T12:00:00');
        const diasAteVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
        
        if (parcela.status === 'pendente') {
            totalReceber += valor;
            
            if (diasAteVencimento < 0) {
                totalAtrasado += valor;
            } else if (diasAteVencimento <= 30) {
                totalVencer += valor;
            }
            
            const diffMeses = (vencimento.getMonth() - hoje.getMonth()) + 
                            (vencimento.getFullYear() - hoje.getFullYear()) * 12;
            if (diffMeses >= 0 && diffMeses < 6) {
                valoresPorMes[diffMeses] += valor;
            }
            
        } else if (parcela.status === 'pago') {
            const dataPagamento = parcela.dataPagamento ? new Date(parcela.dataPagamento + 'T12:00:00') : null;
            if (dataPagamento && 
                dataPagamento.getMonth() === mesAtual && 
                dataPagamento.getFullYear() === anoAtual) {
                totalRecebidoMes += valor;
            }
        }
    });
    
    document.getElementById('total-a-receber').innerText = window.formatarValorReais(totalReceber);
    document.getElementById('total-a-vencer').innerText = window.formatarValorReais(totalVencer);
    document.getElementById('total-atrasado').innerText = window.formatarValorReais(totalAtrasado);
    document.getElementById('total-recebido-mes').innerText = window.formatarValorReais(totalRecebidoMes);
    
    const maxValor = Math.max(...valoresPorMes, 1);
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'];
    
    for (let i = 0; i < 6; i++) {
        const barra = document.getElementById(`barra-${meses[i]}`);
        if (barra) {
            const altura = valoresPorMes[i] > 0 ? (valoresPorMes[i] / maxValor) * 140 : 0;
            barra.style.height = altura + 'px';
            barra.title = window.formatarValorReais(valoresPorMes[i]);
        }
    }
    
    const selectCliente = document.getElementById('filtro-cliente-financeiro');
    if (selectCliente) {
        selectCliente.innerHTML = '<option value="todos">Todos os clientes</option>';
        window.bancoClientes.forEach(c => {
            selectCliente.innerHTML += `<option value="${c.nome}">${c.nome}</option>`;
        });
    }
    
    window.filtrarFinanceiro();
};

window.filtrarFinanceiro = function() {
    const statusFiltro = document.getElementById('filtro-status-financeiro')?.value || 'todos';
    const clienteFiltro = document.getElementById('filtro-cliente-financeiro')?.value || 'todos';
    const busca = document.getElementById('busca-financeiro')?.value.toLowerCase() || '';
    
    const hoje = new Date();
    
    let parcelasFiltradas = window.bancoParcelas.filter(p => {
        if (statusFiltro !== 'todos') {
            if (statusFiltro === 'atrasado') {
                const vencimento = new Date(p.vencimento + 'T12:00:00');
                const dias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                if (p.status !== 'pendente' || dias >= 0) return false;
            } else if (p.status !== statusFiltro) {
                return false;
            }
        }
        
        if (clienteFiltro !== 'todos' && p.cliente !== clienteFiltro) return false;
        
        if (busca) {
            const clienteMatch = p.cliente?.toLowerCase().includes(busca);
            const pedidoMatch = p.pedidoId?.toLowerCase().includes(busca);
            if (!clienteMatch && !pedidoMatch) return false;
        }
        
        return true;
    });
    
    parcelasFiltradas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    
    let html = '';
    
    if (parcelasFiltradas.length === 0) {
        html = '<tr><td colspan="8" class="p-4 text-center text-gray-500">Nenhuma parcela encontrada</td></tr>';
    } else {
        parcelasFiltradas.forEach(p => {
            const vencimento = new Date(p.vencimento + 'T12:00:00');
            const diasAteVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
            
            let statusClass = '';
            let statusText = '';
            let diasTexto = '';
            let diasClass = '';
            let linhaClass = '';
            
            if (p.status === 'pago') {
                statusClass = 'badge-pago';
                statusText = 'Pago';
                diasTexto = 'Pago';
                diasClass = 'text-green-600';
                linhaClass = 'status-pago';
            } else if (diasAteVencimento < 0) {
                statusClass = 'badge-atrasado';
                statusText = 'Atrasado';
                diasTexto = `${Math.abs(diasAteVencimento)} dias atrasado`;
                diasClass = 'text-red-600 font-bold';
                linhaClass = 'status-atrasado';
            } else if (diasAteVencimento === 0) {
                statusClass = 'badge-pendente';
                statusText = 'Vence hoje';
                diasTexto = 'Vence hoje';
                diasClass = 'text-orange-600 font-bold';
                linhaClass = 'status-pendente';
            } else {
                statusClass = 'badge-pendente';
                statusText = 'A Receber';
                diasTexto = `Faltam ${diasAteVencimento} dias`;
                diasClass = 'text-yellow-600';
                linhaClass = 'status-pendente';
            }
            
            const pedido = window.bancoPedidos.find(ped => ped.id === p.pedidoId);
            const numeroPedido = pedido?.numero_sequencial ? `#${pedido.numero_sequencial.toString().padStart(3, '0')}` : p.pedidoId.substring(0,6);
            
            const parcelaTexto = p.totalParcelas > 1 ? `${p.numeroParcela}/${p.totalParcelas}` : 'Única';
            
            html += `
            <tr class="border-b hover:bg-gray-50 ${linhaClass}">
                <td class="p-2 border">${p.cliente}</td>
                <td class="p-2 border font-bold">${numeroPedido}</td>
                <td class="p-2 border">${parcelaTexto}</td>
                <td class="p-2 border">${window.formatarDataParaExibir(p.vencimento)}</td>
                <td class="p-2 border">${window.formatarValorReais(p.valor)}</td>
                <td class="p-2 border">
                    <span class="px-2 py-1 rounded-full text-xs font-medium text-white ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="p-2 border ${diasClass}">${diasTexto}</td>
                <td class="p-2 border">
                    ${p.status !== 'pago' ? `
                        <button onclick="window.receberParcela('${p.firebaseId}')" class="text-green-600 hover:text-green-800 mr-2" title="Receber parcela">
                            💰 Receber
                        </button>
                    ` : '✅'}
                    <button onclick="window.verDetalhesParcela('${p.pedidoId}')" class="text-blue-600 hover:text-blue-800" title="Ver pedido">
                        👁️
                    </button>
                </td>
            </tr>`;
        });
    }
    
    document.getElementById('tabela-financeiro').innerHTML = html;
};

window.verDetalhesParcela = function(pedidoId) {
    const pedido = window.bancoPedidos.find(p => p.id === pedidoId);
    if (pedido) {
        window.abrirPedidoParaEdicao(pedidoId);
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Pedido não encontrado!',
            confirmButtonColor: '#3b82f6'
        });
    }
};

// ==========================================
// FUNÇÕES DE STATUS
// ==========================================
window.selecionarStatus = function(novoStatus) {
    const selectStatus = document.getElementById('select-status');
    const statusAtual = selectStatus ? selectStatus.value : 'Orçamento';
    
    if (statusAtual === novoStatus) return;
    
    const fluxoPermitido = {
        'Orçamento': ['Produção'],
        'Produção': ['Em Entrega'],
        'Em Entrega': ['Entregue'],
        'Entregue': []
    };
    
    const transicoesPermitidas = fluxoPermitido[statusAtual] || [];
    
    if (!transicoesPermitidas.includes(novoStatus) && statusAtual !== 'Orçamento') {
        let mensagem = '';
        if (statusAtual === 'Entregue') mensagem = '❌ Pedido entregue não pode ser alterado!';
        else if (statusAtual === 'Em Entrega') mensagem = '❌ Em entrega só pode ir para Entregue!';
        else if (statusAtual === 'Produção') mensagem = '❌ Produção não pode voltar para Orçamento!';
        else mensagem = `❌ Transição inválida!`;
        
        Swal.fire({
            icon: 'error',
            title: 'Transição inválida',
            text: mensagem,
            confirmButtonColor: '#3b82f6'
        });
        
        atualizarBotoesStatus(statusAtual);
        return;
    }
    
    if (selectStatus) selectStatus.value = novoStatus;
    atualizarBotoesStatus(novoStatus);
    atualizarBarraProgresso(novoStatus);
    
    const statusBloqueados = ['Produção', 'Em Entrega', 'Entregue'];
    if (statusBloqueados.includes(novoStatus)) {
        bloquearCampos(true);
        const aviso = document.getElementById('aviso-bloqueio');
        const spanStatus = document.getElementById('status-bloqueio');
        if (aviso && spanStatus) {
            spanStatus.innerText = novoStatus;
            aviso.classList.remove('hidden');
        }
    } else {
        bloquearCampos(false);
        const aviso = document.getElementById('aviso-bloqueio');
        if (aviso) aviso.classList.add('hidden');
    }
    
    const pedidoId = document.getElementById('pedido-id-atual').value;
    const clienteSelect = document.getElementById('input-cliente');
    const cliente = clienteSelect ? clienteSelect.value : '';
    
    if (!cliente) {
        Swal.fire({
            icon: 'warning',
            title: 'Cliente não selecionado',
            text: 'Selecione um cliente antes de mudar o status!',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    Swal.fire({
        title: 'Salvar pedido?',
        text: `Status alterado para ${novoStatus}. Deseja salvar o pedido agora?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, salvar',
        cancelButtonText: 'Não'
    }).then((result) => {
        if (result.isConfirmed) {
            salvarPedidoAtual();
        }
    });
};

function bloquearCampos(bloquear) {
    const campos = [
        'input-cliente',
        'input-km',
        'input-litro',
        'input-consumo',
        'input-pedagio',
        'input-desconto',
        'input-acrescimo',
        'input-motivo-acrescimo',
        'select-pagamento',
        'select-condicao-pagamento',
        'input-parcelas',
        'input-primeiro-vencimento',
        'input-previsao'
    ];
    
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            if (bloquear) {
                campo.setAttribute('disabled', 'disabled');
                campo.classList.add('bg-gray-100', 'cursor-not-allowed');
            } else {
                campo.removeAttribute('disabled');
                campo.classList.remove('bg-gray-100', 'cursor-not-allowed');
            }
        }
    });
    
    document.querySelectorAll('#tabela-itens input, #tabela-itens select').forEach(input => {
        if (bloquear) {
            input.setAttribute('disabled', 'disabled');
            input.classList.add('bg-gray-100', 'cursor-not-allowed');
        } else {
            input.removeAttribute('disabled');
            input.classList.remove('bg-gray-100', 'cursor-not-allowed');
        }
    });
    
    document.querySelectorAll('#tabela-itens button').forEach(btn => {
        if (bloquear) {
            btn.setAttribute('disabled', 'disabled');
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btn.removeAttribute('disabled');
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
    
    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) {
        if (bloquear) {
            btnSalvar.setAttribute('disabled', 'disabled');
            btnSalvar.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnSalvar.removeAttribute('disabled');
            btnSalvar.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}
window.bloquearCampos = bloquearCampos;

function atualizarBotoesStatus(status) {
    const botoes = [
        { id: 'status-orcamento', status: 'Orçamento', cor: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
        { id: 'status-producao', status: 'Produção', cor: 'border-blue-500 bg-blue-50 text-blue-700' },
        { id: 'status-entrega', status: 'Em Entrega', cor: 'border-orange-500 bg-orange-50 text-orange-700' },
        { id: 'status-entregue', status: 'Entregue', cor: 'border-green-500 bg-green-50 text-green-700' }
    ];
    
    botoes.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            btn.classList.remove(
                'border-yellow-500', 'bg-yellow-50', 'text-yellow-700',
                'border-blue-500', 'bg-blue-50', 'text-blue-700',
                'border-orange-500', 'bg-orange-50', 'text-orange-700',
                'border-green-500', 'bg-green-50', 'text-green-700'
            );
            btn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-700');
        }
    });
    
    const selecionado = botoes.find(b => b.status === status);
    if (selecionado) {
        const btn = document.getElementById(selecionado.id);
        if (btn) {
            btn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-700');
            const classes = selecionado.cor.split(' ');
            btn.classList.add(...classes);
        }
    }
}

function atualizarBarraProgresso(status) {
    const barra = document.getElementById('progress-bar');
    const label = document.getElementById('status-label');
    
    if (!barra || !label) return;
    
    const progressos = {
        'Orçamento': { width: '25%', cor: 'bg-yellow-500', texto: 'Orçamento' },
        'Produção': { width: '50%', cor: 'bg-blue-500', texto: 'Em produção' },
        'Em Entrega': { width: '75%', cor: 'bg-orange-500', texto: 'Saiu para entrega' },
        'Entregue': { width: '100%', cor: 'bg-green-500', texto: 'Entregue' }
    };
    
    const prog = progressos[status] || progressos['Orçamento'];
    
    barra.classList.remove('bg-yellow-500', 'bg-blue-500', 'bg-orange-500', 'bg-green-500');
    barra.classList.add(prog.cor);
    barra.style.width = prog.width;
    
    label.innerHTML = `Status: ${status} - ${prog.texto}`;
}

function gerarBadgeStatus(status) {
    const config = {
        'Orçamento': { cor: 'bg-yellow-100 text-yellow-800 border-yellow-300', icone: '📋' },
        'Produção': { cor: 'bg-blue-100 text-blue-800 border-blue-300', icone: '🔧' },
        'Em Entrega': { cor: 'bg-orange-100 text-orange-800 border-orange-300', icone: '🚚' },
        'Entregue': { cor: 'bg-green-100 text-green-800 border-green-300', icone: '✅' }
    };
    const cfg = config[status] || { cor: 'bg-gray-100 text-gray-800 border-gray-300', icone: '📦' };
    return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${cfg.cor}">${cfg.icone} ${status}</span>`;
}

// ==========================================
// FUNÇÕES DO BANCO DE DADOS
// ==========================================
async function obterProximoNumeroPedido() {
    const ref = doc(db, "configuracoes", "contador_pedidos");
    return await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const n = snap.exists() ? snap.data().ultimo_numero + 1 : 1;
        t.set(ref, { ultimo_numero: n }); 
        return n;
    });
}

async function carregarMemoriaBanco() {
    try {
        console.log('📥 Carregando clientes...');
        const cliSnap = await getDocs(collection(db, "clientes"));
        window.bancoClientes = cliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('📥 Carregando produtos...');
        const prodSnap = await getDocs(collection(db, "produtos"));
        window.bancoProdutos = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('📥 Carregando pedidos...');
        const pedSnap = await getDocs(collection(db, "pedidos"));
        window.bancoPedidos = pedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('📥 Carregando parcelas...');
        await carregarParcelasDoFirebase();
        
        window.bancoPedidos.sort((a,b) => (b.data_criacao?.seconds || 0) - (a.data_criacao?.seconds || 0));
        
        renderizarTudo();
    } catch (e) { 
        console.error("Erro ao carregar:", e); 
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao carregar dados do banco!',
            confirmButtonColor: '#3b82f6'
        });
    }
}

function renderizarTudo() {
    document.getElementById('tabela-pedidos').innerHTML = window.bancoPedidos.map(p => `
        <tr class="border-b text-sm hover:bg-gray-50">
            <td class="p-2 border-r font-bold">#${p.numero_sequencial?.toString().padStart(3,'0') || 'S/N'}</td>
            <td class="p-2 border-r">${p.data_criacao ? new Date(p.data_criacao.seconds*1000).toLocaleDateString() : '-'}</td>
            <td class="p-2 border-r">${p.cliente_nome}</td>
            <td class="p-2 border-r">${gerarBadgeStatus(p.status)}</td>
            <td class="p-2 border-r">${window.formatarValorReais(p.valor_total)}</td>
            <td class="p-2 border-r">${p.condicao_pagamento || 'Vista'}</td>
            <td class="p-2 text-center">
                <button onclick="window.abrirPedidoParaEdicao('${p.id}')" class="btn btn-dark btn-sm">
                    👁️ Abrir
                </button>
            </td>
        </tr>`).join('');

    document.getElementById('lista-clientes').innerHTML = window.bancoClientes.map(c => {
        const telefone = c.telefone || '-';
        const endereco = c.endereco || '-';
        const enderecoResumido = endereco.length > 30 ? endereco.substring(0,30) + '...' : endereco;
        const limite = c.limite ? window.formatarValorReais(c.limite) : 'R$ 0,00';
        
        return `
        <tr class="border-b text-sm hover:bg-gray-50">
            <td class="p-2 border">${c.codigo || '---'}</td>
            <td class="p-2 border">${c.nome}</td>
            <td class="p-2 border">${telefone}</td>
            <td class="p-2 border">${enderecoResumido}</td>
            <td class="p-2 border">${limite}</td>
            <td class="p-2 border">
                <button onclick="window.editarCliente('${c.id}','${c.nome}','${c.telefone || ''}','${c.documento || ''}','${c.endereco || ''}','${c.cep || ''}','${c.email || ''}','${c.nascimento || ''}','${c.limite || 0}','${c.observacoes || ''}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Editar">
                    ✏️
                </button>
                <button onclick="window.excluirCliente('${c.id}')" class="text-red-600 hover:text-red-800" title="Excluir">
                    🗑️
                </button>
            </td>
        </tr>`}).join('') || '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum cliente encontrado</td></tr>';

    document.getElementById('lista-produtos').innerHTML = window.bancoProdutos.map(p => {
        let estoqueClass = '';
        let estoqueText = '';
        
        if (p.estoque_atual !== undefined) {
            if (p.estoque_atual <= 0) {
                estoqueClass = 'text-red-600 font-bold';
                estoqueText = 'ESGOTADO';
            } else if (p.estoque_minimo && p.estoque_atual <= p.estoque_minimo) {
                estoqueClass = 'text-orange-600 font-bold';
                estoqueText = 'BAIXO';
            } else {
                estoqueClass = 'text-green-600';
                estoqueText = p.estoque_atual;
            }
        }
        
        return `
        <tr class="border-b text-sm hover:bg-gray-50">
            <td class="p-2 border font-mono font-bold">${p.codigo || '---'}</td>
            <td class="p-2 border">${p.descricao}</td>
            <td class="p-2 border">${p.categoria || '-'}</td>
            <td class="p-2 border">${p.marca || '-'}</td>
            <td class="p-2 border font-bold">${window.formatarValorReais(p.valor_base)}</td>
            <td class="p-2 border ${estoqueClass}">${estoqueText}</td>
            <td class="p-2 border">
                <button onclick="window.editarProduto('${p.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Editar">
                    ✏️
                </button>
                <button onclick="window.excluirProduto('${p.id}')" class="text-red-600 hover:text-red-800" title="Excluir">
                    🗑️
                </button>
            </td>
        </tr>`}).join('') || '<tr><td colspan="7" class="p-4 text-center text-gray-500">Nenhum produto encontrado</td></tr>';

    const selectCliente = document.getElementById('input-cliente');
    if (selectCliente) {
        const currentValue = selectCliente.value;
        selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
        window.bancoClientes.forEach(c => {
            selectCliente.innerHTML += `<option value="${c.nome}">${c.codigo ? '[' + c.codigo + '] ' : ''}${c.nome}</option>`;
        });
        if (currentValue) {
            selectCliente.value = currentValue;
        }
        
        if ($.fn.select2) {
            $(selectCliente).select2({
                placeholder: "Busque um cliente...",
                allowClear: true,
                width: '100%'
            });
        }
    }
    
    const dlCli = document.getElementById('lista-sugestao-clientes');
    if(dlCli) dlCli.innerHTML = window.bancoClientes.map(c => `<option value="${c.nome}">`).join('');
    
    const dlProd = document.getElementById('lista-sugestao-produtos');
    if(dlProd) dlProd.innerHTML = window.bancoProdutos.map(p => `<option value="${p.descricao}">`).join('');
}

function renderizarTabelaPedidosNoFilter(lista) {
    document.getElementById('tabela-pedidos').innerHTML = lista.map(p => `
        <tr class="border-b text-sm hover:bg-gray-50">
            <td class="p-2 border-r font-bold">#${p.numero_sequencial?.toString().padStart(3,'0') || 'S/N'}</td>
            <td class="p-2 border-r">${p.data_criacao ? new Date(p.data_criacao.seconds*1000).toLocaleDateString() : '-'}</td>
            <td class="p-2 border-r">${p.cliente_nome}</td>
            <td class="p-2 border-r">${gerarBadgeStatus(p.status)}</td>
            <td class="p-2 border-r">${window.formatarValorReais(p.valor_total)}</td>
            <td class="p-2 border-r">${p.condicao_pagamento || 'Vista'}</td>
            <td class="p-2 text-center">
                <button onclick="window.abrirPedidoParaEdicao('${p.id}')" class="btn btn-dark btn-sm">
                    👁️ Abrir
                </button>
            </td>
        </tr>`).join('');
}

// ==========================================
// FUNÇÃO PARA NOVO PEDIDO (VERSÃO CORRIGIDA: INICIA LIMPO)
// ==========================================
window.novoPedido = function() {
    console.log('➕ Iniciando novo pedido - reset completo');
    
    bloquearCampos(false);
    document.getElementById('aviso-bloqueio').classList.add('hidden');
    
    document.getElementById('pedido-id-atual').value = '';
    
    const selectCliente = document.getElementById('input-cliente');
    if (selectCliente) {
        if ($.fn.select2) $(selectCliente).val('').trigger('change');
        else selectCliente.value = '';
    }
    
    document.getElementById('input-endereco').value = '';
    document.getElementById('dados-cliente-container').classList.add('hidden');
    document.getElementById('input-km').value = '';
    document.getElementById('input-desconto').value = '0';
    document.getElementById('input-previsao').value = '';
    document.getElementById('pdf-n-display').innerText = '';
    
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.innerHTML = '📦 Salvar Pedido';
    
    const tbody = document.getElementById('tabela-itens');
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Tabela vazia. Use o botão azul para adicionar produtos.</td></tr>';
    
    window.selecionarStatus('Orçamento');
    window.calcularTudo();
};

// ==========================================
// FUNÇÃO PARA CANCELAR EDIÇÃO
// ==========================================
window.cancelarEdicao = async function() {
    const result = await Swal.fire({
        title: 'Cancelar edição?',
        text: 'Todas as alterações não salvas serão perdidas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, cancelar',
        cancelButtonText: 'Não'
    });
    
    if (result.isConfirmed) {
        window.novoPedido();
    }
};

// ==========================================
// FUNÇÃO PARA SALVAR PEDIDO (COM TRAVA DE LIMITE)
// ==========================================
async function salvarPedidoAtual() {
    console.log('💾 Iniciando salvamento do pedido...');
    
    if (!auth.currentUser) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Usuário não autenticado!' });
        return;
    }
    
    const btn = document.getElementById('btn-salvar');
    if (!btn) return;
    
    const textoOriginal = btn.innerHTML;
    const id = document.getElementById('pedido-id-atual')?.value;
    
    const selectCliente = document.getElementById('input-cliente');
    const nomeCliente = selectCliente ? selectCliente.value : '';
    const cliente = window.bancoClientes.find(c => c.nome === nomeCliente);
    
    if (!cliente) {
        Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione um cliente válido!' });
        return;
    }
    
    const statusAtual = document.getElementById('select-status')?.value || 'Orçamento';
    const totalNovoPedido = parseFloat(document.getElementById('btn-gerar-pdf')?.getAttribute('data-total')?.replace(',','.') || '0');

    // === TRAVA DE LIMITE DE CRÉDITO ===
    if (statusAtual === 'Produção') {
        const creditoOk = window.verificarLimiteCredito(nomeCliente, totalNovoPedido);
        if (!creditoOk) return; // Cancela salvamento se ultrapassar o limite
    }
    
    const dados = {
        cliente_nome: nomeCliente,
        cliente_id: cliente.id,
        cliente_endereco: cliente.endereco || '',
        status: statusAtual,
        valor_total: totalNovoPedido,
        itens: []
    };
    
    document.querySelectorAll('#tabela-itens tr').forEach(tr => {
        const select = tr.querySelector('.desc-item');
        if (select && select.value && select.value !== 'Selecione um produto') {
            dados.itens.push({ 
                quantidade: tr.querySelector('.qtd-item')?.value || '1', 
                descricao: select.value, 
                fornecedor: tr.querySelector('.forn-item')?.value || '', 
                valor_unitario: tr.querySelector('.valor-item')?.value?.replace('R$', '').trim() || '0,00'
            });
        }
    });
    
    if (dados.itens.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Sem itens', text: 'Adicione pelo menos um item!' });
        return;
    }
    
    btn.innerHTML = '💾 Salvando...';
    btn.disabled = true;
    
    try {
        if (id) await updateDoc(doc(db, "pedidos", id), dados);
        else {
            dados.numero_sequencial = await obterProximoNumeroPedido();
            dados.data_criacao = serverTimestamp();
            await addDoc(collection(db, "pedidos"), dados);
        }
        Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Pedido salvo!', timer: 2000, showConfirmButton: false });
        await carregarMemoriaBanco();
    } catch (error) {
        console.error('Erro ao salvar:', error);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

function atualizarTextoBotaoSalvar(modo) {
    const btn = document.getElementById('btn-salvar');
    if (modo === 'editando') {
        btn.innerHTML = '✏️ Atualizar Pedido';
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        btn.innerHTML = '📦 Salvar Pedido';
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
}

// ==========================================
// ADICIONAR EVENT LISTENER AO BOTÃO SALVAR
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Configurando botão salvar...');
    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) {
        const newBtnSalvar = btnSalvar.cloneNode(true);
        btnSalvar.parentNode.replaceChild(newBtnSalvar, btnSalvar);
        newBtnSalvar.addEventListener('click', salvarPedidoAtual);
        console.log('✅ Botão salvar configurado com sucesso!');
    }
});

// ==========================================
// FUNÇÕES DE CLIENTES
// ==========================================
document.getElementById('btn-salvar-cliente').addEventListener('click', async () => {
    const id = document.getElementById('cli-id').value;
    const nome = document.getElementById('cli-nome').value;
    if (!nome) return;
    
    const d = { 
        nome: nome, 
        telefone: document.getElementById('cli-telefone').value,
        documento: document.getElementById('cli-documento').value,
        cep: document.getElementById('cli-cep').value,
        endereco: document.getElementById('cli-endereco').value,
        email: document.getElementById('cli-email')?.value || '',
        nascimento: document.getElementById('cli-nascimento')?.value || '',
        limite: parseFloat(document.getElementById('cli-limite')?.value.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        observacoes: document.getElementById('cli-obs')?.value || ''
    };
    
    if(!id) {
        let maxCodigo = 0;
        window.bancoClientes.forEach(c => { if (c.codigo && parseInt(c.codigo) > maxCodigo) maxCodigo = parseInt(c.codigo); });
        d.codigo = (maxCodigo + 1).toString().padStart(4, '0');
    }

    try {
        if(id) await updateDoc(doc(db,"clientes",id), d);
        else await addDoc(collection(db,"clientes"), {...d, data_cadastro: serverTimestamp()});
        Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Salvo!', timer: 1500, showConfirmButton: false });
        cancelarEdicaoCliente();
        carregarMemoriaBanco();
    } catch (e) { console.error(e); }
});

// ==========================================
// FUNÇÃO PRINCIPAL - ABRIR PEDIDO
// ==========================================
window.abrirPedidoParaEdicao = function(id) {
    console.log('🔍 Abrindo pedido:', id);
    const pedido = window.bancoPedidos.find(x => x.id === id);
    if (!pedido) return;

    bloquearCampos(false);
    document.getElementById('aviso-bloqueio').classList.add('hidden');
    document.getElementById('pedido-id-atual').value = pedido.id;
    
    const selectCliente = document.getElementById('input-cliente');
    if (selectCliente && pedido.cliente_nome) {
        if ($.fn.select2) $(selectCliente).val(pedido.cliente_nome).trigger('change');
        else selectCliente.value = pedido.cliente_nome;
    }
    
    document.getElementById('pdf-n-display').innerText = '#' + (pedido.numero_sequencial?.toString().padStart(3,'0') || '???');
    
    if (pedido.status) {
        document.getElementById('select-status').value = pedido.status;
        atualizarBotoesStatus(pedido.status);
        atualizarBarraProgresso(pedido.status);
    }
    
    const estaBloqueado = ['Produção', 'Em Entrega', 'Entregue'].includes(pedido.status);
    if (estaBloqueado) {
        bloquearCampos(true);
        const aviso = document.getElementById('aviso-bloqueio');
        const spanStatus = document.getElementById('status-bloqueio');
        if (aviso && spanStatus) {
            spanStatus.innerText = pedido.status;
            aviso.classList.remove('hidden');
        }
    }

    const tbody = document.getElementById('tabela-itens');
    tbody.innerHTML = '';

    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach((item, index) => {
            const tr = document.createElement('tr'); 
            tr.className = 'text-sm';
            const descItemNormalizada = item.descricao ? item.descricao.trim().toLowerCase() : '';
            const produtoNoBanco = window.bancoProdutos.find(p => 
                (p.descricao ? p.descricao.trim().toLowerCase() : '') === descItemNormalizada
            );

            const codigoExibicao = produtoNoBanco ? produtoNoBanco.codigo : '---';
            const selectId = 'produto-select-' + Date.now() + '-' + index;
            const travaSelect = estaBloqueado ? 'disabled' : '';

            let selectHtml = `<select id="${selectId}" ${travaSelect} class="w-full p-1 border rounded desc-item border-blue-300 focus:ring-2 focus:ring-blue-500 bg-gray-50 produto-select" style="width: 100%;" onchange="window.preencherProduto(this)">`;
            selectHtml += '<option value="">Selecione um produto</option>';
            
            window.bancoProdutos.forEach(p => {
                const pDescNormalizada = p.descricao ? p.descricao.trim().toLowerCase() : '';
                const selected = (pDescNormalizada === descItemNormalizada) ? 'selected' : '';
                selectHtml += `<option value="${p.descricao}" data-valor="${p.valor_base}" data-forn="${p.fornecedor || ''}" ${selected}>${p.descricao}</option>`;
            });
            selectHtml += '</select>';
            
            tr.innerHTML = `
                <td class="p-2 border"><input type="number" ${travaSelect} value="${item.quantidade || 1}" class="w-16 p-1 border rounded qtd-item" onchange="window.calcularTudo()"></td>
                <td class="p-2 border text-center"><span class="codigo-badge">${codigoExibicao}</span></td>
                <td class="p-2 border">${selectHtml}</td>
                <td class="p-2 border"><input type="text" value="${item.fornecedor || ''}" class="w-full p-1 border rounded forn-item bg-gray-100" readonly></td>
                <td class="p-2 border"><input type="text" value="${window.formatarValorReais(item.valor_unitario)}" class="w-24 p-1 border rounded valor-item bg-gray-100 text-right" readonly></td>
                <td class="p-2 border total-linha">R$ 0,00</td>
                <td class="p-2 border text-center"><button onclick="this.closest('tr').remove(); window.calcularTudo();" ${travaSelect} class="text-red-500 font-bold">X</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.mostrarAba('aba-cadastro');
    setTimeout(() => { 
        if ($.fn.select2) $('.produto-select').select2({ width: '100%' });
        window.calcularTudo(); 
    }, 500);
};

// ==========================================
// FUNÇÕES DE EDIÇÃO E EXCLUSÃO
// ==========================================
window.editarCliente = function(id, nome, telefone, documento, endereco, cep, email, nascimento, limite, observacoes) {
    document.getElementById('cli-id').value = id;
    document.getElementById('cli-nome').value = nome;
    document.getElementById('cli-telefone').value = telefone || '';
    document.getElementById('cli-documento').value = documento || '';
    document.getElementById('cli-cep').value = cep || '';
    document.getElementById('cli-endereco').value = endereco || '';
    document.getElementById('cli-email').value = email || '';
    document.getElementById('cli-nascimento').value = nascimento || '';
    document.getElementById('cli-limite').value = limite ? parseFloat(limite).toFixed(2).replace('.', ',') : '0,00';
    document.getElementById('cli-obs').value = observacoes || '';
    document.getElementById('btn-cancelar-cliente').classList.remove('hidden');
    window.mostrarAba('aba-clientes');
};

window.editarProduto = function(id) {
    if (typeof window.abrirCadastroCompletoProduto === 'function') window.abrirCadastroCompletoProduto(id);
};

window.excluirCliente = async (id) => { 
    if ((await Swal.fire({ title: 'Excluir?', icon: 'warning', showCancelButton: true })).isConfirmed) {
        await deleteDoc(doc(db,"clientes",id)); carregarMemoriaBanco();
    }
};

window.excluirProduto = async (id) => { 
    if ((await Swal.fire({ title: 'Excluir?', icon: 'warning', showCancelButton: true })).isConfirmed) {
        await deleteDoc(doc(db,"produtos",id)); carregarMemoriaBanco();
    }
};

window.filtrarPedidos = (t) => { renderizarTabelaPedidosNoFilter(window.bancoPedidos.filter(p => p.cliente_nome?.toLowerCase().includes(t.toLowerCase()))); };

window.cancelarEdicaoCliente = function() {
    const fields = ['cli-id','cli-nome','cli-telefone','cli-documento','cli-cep','cli-endereco','cli-email','cli-nascimento','cli-limite','cli-obs'];
    fields.forEach(f => { const el = document.getElementById(f); if(el) el.value = (f === 'cli-limite' ? '0,00' : ''); });
    document.getElementById('btn-cancelar-cliente').classList.add('hidden');
};

// ==========================================
// EXPORTA TODAS AS FUNÇÕES PARA USO GLOBAL
// ==========================================
window.formatarValorReais = (v) => (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
window.formatarDataParaExibir = (d) => d ? new Date(d.seconds*1000).toLocaleDateString('pt-BR') : '-';
window.carregarMemoriaBanco = carregarMemoriaBanco;
window.carregarDadosFinanceiros = carregarDadosFinanceiros;
window.filtrarFinanceiro = filtrarFinanceiro;
window.receberParcela = receberParcela;
window.verDetalhesParcela = verDetalhesParcela;
window.selecionarStatus = selecionarStatus;
window.novoPedido = novoPedido;
window.cancelarEdicao = cancelarEdicao;
window.abrirPedidoParaEdicao = abrirPedidoParaEdicao;
window.editarCliente = editarCliente;
window.editarProduto = editarProduto;
window.excluirCliente = excluirCliente;
window.excluirProduto = excluirProduto;
window.filtrarPedidos = filtrarPedidos;
window.cancelarEdicaoCliente = cancelarEdicaoCliente;
window.buscarCEPCadastro = buscarCEPCadastro;
window.carregarDadosCliente = carregarDadosCliente;
window.preencherProduto = preencherProduto;
window.atualizarParcelas = atualizarParcelas;
window.salvarPedidoAtual = salvarPedidoAtual;