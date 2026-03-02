// ==========================================
// scripts.js - Funções globais do MPLEÃO
// ==========================================

// ==========================================
// FUNÇÕES DO MODAL DE ITENS - VERSÃO RÁPIDA
// ==========================================

let modalProdutosFiltrados = [];
let modalProdutoSelecionadoIndex = -1;

function abrirModalItens() {
    if (!podeEditarPedido()) {
        Swal.fire({
            icon: 'error',
            title: 'Ação bloqueada',
            text: '❌ Não é possível adicionar itens em um pedido que já está em Produção, Em Entrega ou Entregue!',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    // Verifica se tem produtos cadastrados
    if (!window.bancoProdutos || window.bancoProdutos.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Nenhum produto',
            text: 'Cadastre produtos primeiro!',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    // Resetar estados
    modalProdutosFiltrados = [...window.bancoProdutos];
    modalProdutoSelecionadoIndex = -1;
    
    renderizarListaProdutosRapida();
    document.getElementById('modal-itens').classList.remove('hidden');
    
    // Focar no campo de busca após abrir o modal
    setTimeout(() => {
        const buscaInput = document.getElementById('busca-produtos-modal');
        if (buscaInput) {
            buscaInput.focus();
            buscaInput.select();
        }
    }, 200);
}

function fecharModalItens() {
    document.getElementById('modal-itens').classList.add('hidden');
}

function renderizarListaProdutosRapida() {
    const container = document.getElementById('lista-produtos-modal');
    if (!container) {
        console.error('Elemento lista-produtos-modal não encontrado!');
        return;
    }
    
    let html = '';
    
    modalProdutosFiltrados.forEach((produto, index) => {
        const selectedClass = index === modalProdutoSelecionadoIndex ? 'bg-blue-100 border-blue-500' : '';
        
        html += `
            <div class="flex items-center gap-4 p-3 border rounded-lg hover:bg-blue-50 cursor-pointer produto-item ${selectedClass}" 
                 data-index="${index}" 
                 onclick="selecionarProdutoModal(${index})"
                 ondblclick="adicionarProdutoRapido(${index})">
                <div class="flex-1">
                    <div class="font-medium">${produto.descricao}</div>
                    <div class="text-sm text-gray-500">
                        Fornecedor: ${produto.fornecedor || '-'} | 
                        Valor: ${formatarValorReais(produto.valor_base)}
                    </div>
                </div>
                <div class="w-24 quantidade-container" data-index="${index}">
                    <input type="number" id="qtd-rapida-${index}" value="1" min="1" 
                           class="w-full p-1 border rounded text-sm quantidade-input" 
                           onclick="event.stopPropagation()"
                           onkeydown="quantidadeKeyDown(event, ${index})">
                </div>
            </div>
        `;
    });
    
    if (modalProdutosFiltrados.length === 0) {
        html = '<p class="text-center text-gray-500 py-4">Nenhum produto encontrado</p>';
    }
    
    container.innerHTML = html;
}

function selecionarProdutoModal(index) {
    modalProdutoSelecionadoIndex = index;
    
    // Atualizar visual da seleção
    document.querySelectorAll('.produto-item').forEach(item => {
        item.classList.remove('bg-blue-100', 'border-blue-500');
    });
    
    const selectedItem = document.querySelector(`.produto-item[data-index="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add('bg-blue-100', 'border-blue-500');
        
        // Focar no campo de quantidade
        setTimeout(() => {
            const qtdInput = document.getElementById(`qtd-rapida-${index}`);
            if (qtdInput) {
                qtdInput.focus();
                qtdInput.select();
            }
        }, 50);
    }
}

function quantidadeKeyDown(event, index) {
    if (event.key === 'Enter') {
        event.preventDefault();
        adicionarProdutoRapido(index);
    }
}

function filtrarProdutosModal(termo) {
    if (!termo) {
        modalProdutosFiltrados = [...window.bancoProdutos];
    } else {
        const termoLower = termo.toLowerCase();
        modalProdutosFiltrados = window.bancoProdutos.filter(p => 
            p.descricao.toLowerCase().includes(termoLower) || 
            (p.fornecedor && p.fornecedor.toLowerCase().includes(termoLower))
        );
    }
    
    modalProdutoSelecionadoIndex = -1;
    renderizarListaProdutosRapida();
}

function adicionarProdutoRapido(index) {
    const produto = modalProdutosFiltrados[index];
    if (!produto) return;
    
    const quantidadeInput = document.getElementById(`qtd-rapida-${index}`);
    const quantidade = quantidadeInput ? parseInt(quantidadeInput.value) || 1 : 1;
    
    adicionarProdutoNaTabela(produto, quantidade);
    
    // Limpar busca e manter modal aberto para próximo item
    const buscaInput = document.getElementById('busca-produtos-modal');
    if (buscaInput) {
        buscaInput.value = '';
        buscaInput.focus();
    }
    
    // Recarregar lista completa
    modalProdutosFiltrados = [...window.bancoProdutos];
    modalProdutoSelecionadoIndex = -1;
    renderizarListaProdutosRapida();
}

function adicionarProdutoNaTabela(produto, quantidade) {
    const tbody = document.getElementById('tabela-itens');
    
    // Verifica se a linha de adicionar existe, se não, cria
    let linhaAdicionar = document.getElementById('linha-adicionar');
    
    if (!linhaAdicionar && tbody) {
        linhaAdicionar = document.createElement('tr');
        linhaAdicionar.id = 'linha-adicionar';
        linhaAdicionar.className = 'text-sm';
        linhaAdicionar.innerHTML = `
            <td class="p-2 border bg-gray-50 text-center" colspan="6">
                <button onclick="adicionarLinha()" class="text-blue-600 font-semibold hover:underline w-full py-2">
                    + Adicionar Item Manualmente
                </button>
            </td>
        `;
        tbody.appendChild(linhaAdicionar);
    }
    
    if (!linhaAdicionar) return;
    
    // Cria nova linha na tabela
    const novaLinha = document.createElement('tr');
    novaLinha.className = 'text-sm';
    
    const selectId = 'produto-select-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    
    // Monta o select com o produto pré-selecionado
    let selectHtml = `<select id="${selectId}" class="w-full p-1 border rounded desc-item border-blue-300 focus:ring-2 focus:ring-blue-500 bg-gray-50 produto-select" style="width: 100%;" onchange="window.preencherProduto(this)">`;
    selectHtml += '<option value="">Selecione um produto</option>';
    
    if (window.bancoProdutos && window.bancoProdutos.length > 0) {
        window.bancoProdutos.forEach(p => {
            const selected = p.descricao === produto.descricao ? 'selected' : '';
            selectHtml += `<option value="${p.descricao}" data-valor="${p.valor_base}" data-forn="${p.fornecedor || ''}" ${selected}>${p.descricao} - ${formatarValorReais(p.valor_base)}</option>`;
        });
    }
    
    selectHtml += '</select>';
    
    novaLinha.innerHTML = `
        <td class="p-2 border"><input type="number" value="${quantidade}" min="1" class="w-16 p-1 border rounded qtd-item" onchange="calcularTudo()" onkeyup="calcularTudo()"></td>
        <td class="p-2 border">${selectHtml}</td>
        <td class="p-2 border"><input type="text" value="${produto.fornecedor || ''}" class="w-full p-1 border rounded forn-item bg-gray-100" readonly></td>
        <td class="p-2 border"><input type="text" value="${formatarValorReais(produto.valor_base)}" class="w-24 p-1 border rounded valor-item bg-gray-100 text-right" readonly></td>
        <td class="p-2 border total-linha">R$ 0,00</td>
        <td class="p-2 border text-center"><button onclick="if(podeEditarPedido()) { this.closest('tr').remove(); setTimeout(calcularTudo, 50); } else { Swal.fire({ icon: 'error', title: 'Ação bloqueada', text: '❌ Não é possível remover itens de um pedido em andamento!', confirmButtonColor: '#3b82f6' }); }" class="text-red-500 font-bold hover:text-red-700">X</button></td>
    `;
    
    tbody.insertBefore(novaLinha, linhaAdicionar);
    
    // Inicializa Select2 no novo select
    setTimeout(() => {
        try {
            const newSelect = document.getElementById(selectId);
            if (newSelect && $.fn && $.fn.select2) {
                $(newSelect).select2({
                    placeholder: "Busque um produto...",
                    allowClear: true,
                    width: '100%'
                });
            }
        } catch (e) {
            console.warn('Erro ao inicializar Select2:', e);
        }
    }, 100);
    
    // Recalcular total
    setTimeout(calcularTudo, 50);
}

function adicionarProdutosSelecionados() {
    // Esta função agora só fecha o modal (mantida para compatibilidade com botão)
    fecharModalItens();
}

// Adicionar evento de teclado global para o modal
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('modal-itens');
    if (!modal || modal.classList.contains('hidden')) return;
    
    const buscaInput = document.getElementById('busca-produtos-modal');
    const isBuscaFocused = document.activeElement === buscaInput;
    
    // ESC fecha o modal
    if (event.key === 'Escape') {
        fecharModalItens();
        event.preventDefault();
    }
    
    // Seta para baixo - navegar na lista
    if (event.key === 'ArrowDown' && isBuscaFocused) {
        event.preventDefault();
        if (modalProdutosFiltrados.length > 0) {
            if (modalProdutoSelecionadoIndex < modalProdutosFiltrados.length - 1) {
                selecionarProdutoModal(modalProdutoSelecionadoIndex + 1);
            } else {
                selecionarProdutoModal(0);
            }
        }
    }
    
    // Seta para cima - navegar na lista
    if (event.key === 'ArrowUp' && isBuscaFocused) {
        event.preventDefault();
        if (modalProdutosFiltrados.length > 0) {
            if (modalProdutoSelecionadoIndex > 0) {
                selecionarProdutoModal(modalProdutoSelecionadoIndex - 1);
            } else {
                selecionarProdutoModal(modalProdutosFiltrados.length - 1);
            }
        }
    }
    
    // ENTER no campo de busca - adicionar item selecionado
    if (event.key === 'Enter' && isBuscaFocused && modalProdutoSelecionadoIndex >= 0) {
        event.preventDefault();
        adicionarProdutoRapido(modalProdutoSelecionadoIndex);
    }
});

// ---------- Navegação ----------
function mostrarAba(abaId) {
    const abas = ['aba-cadastro', 'aba-clientes', 'aba-produtos', 'aba-logistica', 'aba-financeiro'];
    abas.forEach(aba => {
        const el = document.getElementById(aba);
        if (el) el.classList.add('hidden');
    });
    
    const abaEl = document.getElementById(abaId);
    if (abaEl) abaEl.classList.remove('hidden');
    
    const botoes = ['btn-cadastro', 'btn-clientes', 'btn-produtos', 'btn-logistica', 'btn-financeiro'];
    botoes.forEach(btn => {
        const el = document.getElementById(btn);
        if (el) el.classList.remove('bg-gray-700');
    });
    
    const btnId = 'btn-' + abaId.split('-')[1];
    const btnEl = document.getElementById(btnId);
    if (btnEl) btnEl.classList.add('bg-gray-700');
    
    if (abaId === 'aba-financeiro' && typeof window.carregarDadosFinanceiros === 'function') {
        window.carregarDadosFinanceiros();
    }
}

// ---------- Formatação ----------
function formatarValorReais(valor) {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(num)) return 'R$ 0,00';
    return 'R$ ' + num.toFixed(2).replace('.', ',');
}

function formatarTelefone(input) {
    if (!input) return;
    let numero = input.value.replace(/\D/g, '');
    
    if (numero.length <= 10) {
        numero = numero.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
        numero = numero.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    input.value = numero;
}

function formatarValorInput(input) {
    if (!input) return;
    let valor = input.value.replace(/[^\d]/g, '');
    if (valor === '') {
        input.value = '';
        return;
    }
    
    let numero = parseInt(valor) / 100;
    input.value = numero.toFixed(2).replace('.', ',');
}

function formatarDataParaExibir(dataISO) {
    if (!dataISO) return '-';
    try {
        const data = new Date(dataISO + 'T12:00:00');
        return data.toLocaleDateString('pt-BR');
    } catch (e) {
        return dataISO;
    }
}

function formatarCEP(input) {
    if (!input) return;
    let cep = input.value.replace(/\D/g, '');
    if (cep.length > 5) {
        cep = cep.substring(0,5) + '-' + cep.substring(5,8);
    }
    input.value = cep;
}

// ---------- Linhas da tabela ----------
function adicionarLinha() {
    if (!podeEditarPedido()) {
        Swal.fire({
            icon: 'error',
            title: 'Ação bloqueada',
            text: '❌ Não é possível adicionar itens em um pedido que já está em Produção, Em Entrega ou Entregue!',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    const tbody = document.getElementById('tabela-itens');
    
    // Verifica se a linha de adicionar existe, se não, cria
    let linhaAdicionar = document.getElementById('linha-adicionar');
    
    if (!linhaAdicionar && tbody) {
        linhaAdicionar = document.createElement('tr');
        linhaAdicionar.id = 'linha-adicionar';
        linhaAdicionar.className = 'text-sm';
        linhaAdicionar.innerHTML = `
            <td class="p-2 border bg-gray-50 text-center" colspan="6">
                <button onclick="adicionarLinha()" class="text-blue-600 font-semibold hover:underline w-full py-2">
                    + Adicionar Item Manualmente
                </button>
            </td>
        `;
        tbody.appendChild(linhaAdicionar);
    }
    
    if (!linhaAdicionar) return;
    
    const novaLinha = document.createElement('tr');
    novaLinha.className = 'text-sm';
    
    const selectId = 'produto-select-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    
    novaLinha.innerHTML = `
        <td class="p-2 border"><input type="number" value="1" min="1" class="w-16 p-1 border rounded qtd-item" onchange="calcularTudo()" onkeyup="calcularTudo()"></td>
        <td class="p-2 border">
            <select id="${selectId}" class="w-full p-1 border rounded desc-item border-blue-300 focus:ring-2 focus:ring-blue-500 bg-gray-50 produto-select" style="width: 100%;" onchange="window.preencherProduto(this)">
                <option value="">Selecione um produto</option>
            </select>
        </td>
        <td class="p-2 border">
            <input type="text" placeholder="Fornecedor" class="w-full p-1 border rounded forn-item bg-gray-100" readonly>
        </td>
        <td class="p-2 border"><input type="text" class="w-24 p-1 border rounded valor-item bg-gray-100 text-right" value="R$ 0,00" readonly></td>
        <td class="p-2 border font-semibold total-linha">R$ 0,00</td>
        <td class="p-2 border text-center"><button onclick="if(podeEditarPedido()) { this.closest('tr').remove(); setTimeout(calcularTudo, 50); } else { Swal.fire({ icon: 'error', title: 'Ação bloqueada', text: '❌ Não é possível remover itens de um pedido em andamento!', confirmButtonColor: '#3b82f6' }); }" class="text-red-500 font-bold hover:text-red-700">X</button></td>
    `;
    
    tbody.insertBefore(novaLinha, linhaAdicionar);
    
    const select = document.getElementById(selectId);
    if (select && window.bancoProdutos && window.bancoProdutos.length > 0) {
        window.bancoProdutos.forEach(p => {
            const option = document.createElement('option');
            option.value = p.descricao;
            option.setAttribute('data-valor', p.valor_base);
            option.setAttribute('data-forn', p.fornecedor || '');
            option.textContent = `${p.descricao} - ${formatarValorReais(p.valor_base)}`;
            select.appendChild(option);
        });
        
        if ($.fn && $.fn.select2) {
            setTimeout(() => {
                $(select).select2({
                    placeholder: "Busque um produto...",
                    allowClear: true,
                    width: '100%'
                });
            }, 50);
        }
    }
}

function podeEditarPedido() {
    const statusAtual = document.getElementById('select-status')?.value || 'Orçamento';
    const statusBloqueados = ['Produção', 'Em Entrega', 'Entregue'];
    return !statusBloqueados.includes(statusAtual);
}

// ---------- Cálculos ----------
function calcularTudo() {
    console.log('🔄 Executando calcularTudo()');
    
    const linhas = document.querySelectorAll('#tabela-itens tr:not(#linha-adicionar)');
    let subtotal = 0;

    linhas.forEach((linha) => {
        const qtdInput = linha.querySelector('.qtd-item');
        const valorInput = linha.querySelector('.valor-item');
        const totalLinhaEl = linha.querySelector('.total-linha');
        
        if (!qtdInput || !valorInput || !totalLinhaEl) return;
        
        const qtd = parseFloat(qtdInput.value) || 0;
        const valorTexto = valorInput.value || '0,00';
        
        const valor = parseFloat(valorTexto.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        
        const totalLinha = qtd * valor;
        totalLinhaEl.innerText = formatarValorReais(totalLinha);
        subtotal += totalLinha;
    });

    const descontoInput = document.getElementById('input-desconto');
    const pctDesconto = descontoInput ? parseFloat(descontoInput.value.replace(',', '.')) || 0 : 0;
    const valorDesconto = subtotal * (pctDesconto / 100);
    const subtotalComDesconto = subtotal - valorDesconto;

    const acrescimoInput = document.getElementById('input-acrescimo');
    const acrescimoTexto = acrescimoInput ? acrescimoInput.value || '0,00' : '0,00';
    const acrescimo = parseFloat(acrescimoTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    const km = parseFloat(document.getElementById('input-km')?.value) || 0;
    const precoCombustivel = parseFloat(document.getElementById('input-litro')?.value) || 4.20;
    const consumo = parseFloat(document.getElementById('input-consumo')?.value) || 9.0;
    
    const custoCombustivel = km > 0 ? (km / consumo) * precoCombustivel : 0;
    
    let pedagio = 0;
    const pedagioInput = document.getElementById('input-pedagio')?.value;
    if (pedagioInput) {
        pedagio = parseFloat(pedagioInput.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }
    
    const frete = custoCombustivel + pedagio;
    
    const custoCombustivelEl = document.getElementById('custo-combustivel');
    const custoPedagioEl = document.getElementById('custo-pedagio');
    const custoTotalFreteEl = document.getElementById('custo-total-frete');
    const displayFreteEstimadoEl = document.getElementById('display-frete-estimado');
    
    if (custoCombustivelEl) custoCombustivelEl.innerText = formatarValorReais(custoCombustivel);
    if (custoPedagioEl) custoPedagioEl.innerText = formatarValorReais(pedagio);
    if (custoTotalFreteEl) custoTotalFreteEl.innerText = formatarValorReais(frete);
    if (displayFreteEstimadoEl) displayFreteEstimadoEl.value = formatarValorReais(frete);

    const formaPgto = document.getElementById('select-pagamento')?.value;
    let taxaCartao = 0;
    const infoTaxaEl = document.getElementById('info-taxa');
    
    if (formaPgto === 'Cartão de Crédito') {
        taxaCartao = (subtotalComDesconto + frete + acrescimo) * 0.05; 
        if (infoTaxaEl) {
            infoTaxaEl.innerText = `Taxa Maquininha (5%): ${formatarValorReais(taxaCartao)}`;
            infoTaxaEl.classList.remove('hidden');
        }
    } else if (infoTaxaEl) {
        infoTaxaEl.classList.add('hidden');
    }

    const totalGeral = subtotalComDesconto + frete + taxaCartao + acrescimo;

    const displaySubtotalEl = document.getElementById('display-subtotal');
    const displayDescontoEl = document.getElementById('display-desconto');
    const displayAcrescimoEl = document.getElementById('display-acrescimo');
    const displayFreteFinalEl = document.getElementById('display-frete-final');
    const displayTaxaFinalEl = document.getElementById('display-taxa-final');
    const displayTotalEl = document.getElementById('display-total');
    const btnGerarPdfEl = document.getElementById('btn-gerar-pdf');
    
    if (displaySubtotalEl) displaySubtotalEl.innerText = 'Subtotal: ' + formatarValorReais(subtotal);
    if (displayDescontoEl) displayDescontoEl.innerText = 'Desconto: - ' + formatarValorReais(valorDesconto);
    if (displayAcrescimoEl) displayAcrescimoEl.innerText = 'Acréscimo: + ' + formatarValorReais(acrescimo);
    if (displayFreteFinalEl) displayFreteFinalEl.innerText = 'Frete: ' + formatarValorReais(frete);
    
    if (displayTaxaFinalEl) {
        if (taxaCartao > 0) {
            displayTaxaFinalEl.innerText = 'Taxa Cartão: ' + formatarValorReais(taxaCartao);
            displayTaxaFinalEl.classList.remove('hidden');
        } else {
            displayTaxaFinalEl.classList.add('hidden');
        }
    }

    if (displayTotalEl) displayTotalEl.innerText = 'Total: ' + formatarValorReais(totalGeral);
    if (btnGerarPdfEl) btnGerarPdfEl.setAttribute('data-total', totalGeral.toFixed(2).replace('.', ','));
}

// ---------- PDF ----------
function gerarPDF() {
    const btn = document.getElementById('btn-gerar-pdf');
    if (!btn) return;
    
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '✨ Gerando PDF...';

    const numeroExibicao = document.getElementById('pdf-n-display')?.innerText || 'NOVO';
    const cliente = document.getElementById('input-cliente')?.value || 'Não informado';
    const endereco = document.getElementById('input-endereco')?.value || 'Não informado';
    const previsao = document.getElementById('input-previsao')?.value || 'A combinar';
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const totalGeral = btn.getAttribute('data-total') || '0,00';

    let linhasHtml = '';
    document.querySelectorAll('#tabela-itens tr:not(#linha-adicionar)').forEach(linha => {
        const qtd = linha.querySelector('.qtd-item')?.value || '0';
        const select = linha.querySelector('.desc-item');
        let desc = '';
        
        if (select && select.options && select.selectedIndex >= 0) {
            desc = select.options[select.selectedIndex]?.text.split(' - ')[0] || '';
        }
        
        const total = linha.querySelector('.total-linha')?.innerText || 'R$ 0,00';
        
        if(desc) {
            linhasHtml += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${qtd}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${desc}</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; border: 1px solid #ddd;">${total}</td>
                </tr>`;
        }
    });

    const conteudoCompleto = `
        <div style="padding: 30px; font-family: Arial, sans-serif; color: #333; line-height: 1.4; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #999; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; font-size: 24px; color: #333;">MPLEÃO</h1>
                    <p style="margin: 0; font-size: 11px; color: #666;">Serralheria & Vidraçaria</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 18px; color: #333;">PEDIDO ${numeroExibicao}</h2>
                    <p style="margin: 0; font-size: 11px; color: #666;">Data: ${dataAtual}</p>
                </div>
            </div>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 25px; font-size: 13px; border: 1px solid #ddd;">
                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${cliente}</p>
                <p style="margin: 5px 0;"><strong>Endereço:</strong> ${endereco}</p>
                <p style="margin: 5px 0;"><strong>Previsão de Entrega:</strong> ${previsao}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; border: 1px solid #ddd;">
                <thead>
                    <tr style="background: #e0e0e0; color: #333; text-align: left;">
                        <th style="padding: 10px; border: 1px solid #ddd; width: 50px; text-align: center;">Qtd</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Descrição</th>
                        <th style="padding: 10px; border: 1px solid #ddd; width: 120px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHtml || '<tr><td colspan="3" style="padding: 20px; text-align: center; border: 1px solid #ddd; color: #666;">Nenhum item adicionado</td></tr>'}
                </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 50px;">
                <div style="display: inline-block; background: #f0f0f0; padding: 15px 25px; border-radius: 5px; border: 1px solid #999;">
                    <span style="font-size: 11px; text-transform: uppercase; display: block; color: #666;">Total a Pagar</span>
                    <strong style="font-size: 22px; color: #000;">R$ ${totalGeral}</strong>
                </div>
            </div>

            <div style="margin-top: 80px; display: flex; justify-content: space-between;">
                <div style="width: 40%; border-top: 1px solid #999; text-align: center; padding-top: 8px; font-size: 11px; color: #666;">Assinatura MPLEÃO</div>
                <div style="width: 40%; border-top: 1px solid #999; text-align: center; padding-top: 8px; font-size: 11px; color: #666;">Assinatura do Cliente</div>
            </div>
        </div>
    `;

    const opcoes = {
        margin: 10,
        filename: `Pedido_${cliente.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, logging: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opcoes).from(conteudoCompleto).save().then(() => {
        btn.innerHTML = textoOriginal;
        Swal.fire({
            icon: 'success',
            title: 'PDF Gerado!',
            text: 'O PDF foi gerado com sucesso.',
            timer: 2000,
            showConfirmButton: false
        });
    }).catch(err => {
        console.error("Erro no PDF:", err);
        btn.innerHTML = 'Erro ao gerar';
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao gerar PDF!',
            confirmButtonColor: '#3b82f6'
        });
    });
}

// Exporta funções para uso global
window.mostrarAba = mostrarAba;
window.formatarValorReais = formatarValorReais;
window.formatarTelefone = formatarTelefone;
window.formatarValorInput = formatarValorInput;
window.formatarDataParaExibir = formatarDataParaExibir;
window.formatarCEP = formatarCEP;
window.adicionarLinha = adicionarLinha;
window.podeEditarPedido = podeEditarPedido;
window.calcularTudo = calcularTudo;
window.gerarPDF = gerarPDF;

// Funções do modal
window.abrirModalItens = abrirModalItens;
window.fecharModalItens = fecharModalItens;
window.adicionarProdutosSelecionados = adicionarProdutosSelecionados;
window.filtrarProdutosModal = filtrarProdutosModal;
window.selecionarProdutoModal = selecionarProdutoModal;
window.adicionarProdutoRapido = adicionarProdutoRapido;
window.quantidadeKeyDown = quantidadeKeyDown;