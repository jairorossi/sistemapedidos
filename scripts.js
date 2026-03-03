// ==========================================
// scripts.js - Funções globais do MPLEÃO
// ==========================================

// ==========================================
// VARIÁVEIS GLOBAIS DO MODAL
// ==========================================

let modalProdutosFiltrados = [];
let modalProdutoSelecionadoIndex = -1;
let buscaTimeout = null;
let aguardandoQuantidade = false;
let produtoParaAdicionar = null;

// ==========================================
// FUNÇÕES DO MODAL DE ITENS
// ==========================================

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
    modalProdutosFiltrados = [];
    modalProdutoSelecionadoIndex = -1;
    aguardandoQuantidade = false;
    produtoParaAdicionar = null;
    
    // Limpar busca e lista
    const buscaInput = document.getElementById('busca-produtos-modal');
    if (buscaInput) {
        buscaInput.value = '';
    }
    
    renderizarListaProdutosVazia();
    document.getElementById('modal-itens').classList.remove('hidden');
    
    // Focar no campo de busca após abrir o modal
    setTimeout(() => {
        if (buscaInput) {
            buscaInput.focus();
        }
    }, 200);
}

function renderizarListaProdutosVazia() {
    const container = document.getElementById('lista-produtos-modal');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
            <p class="text-lg mb-2">🔍 Digite para buscar produtos</p>
            <p class="text-sm">Busque por: código, descrição, categoria, cor ou código de barras</p>
            <p class="text-xs mt-4">Mínimo de 2 caracteres | Setas ⬆️⬇️ para navegar | ENTER para selecionar</p>
        </div>
    `;
}

function fecharModalItens() {
    document.getElementById('modal-itens').classList.add('hidden');
    aguardandoQuantidade = false;
    produtoParaAdicionar = null;
}

function renderizarListaProdutosResultados() {
    const container = document.getElementById('lista-produtos-modal');
    if (!container) return;
    
    if (modalProdutosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p class="text-lg mb-2">😕 Nenhum produto encontrado</p>
                <p class="text-sm">Tente outros termos de busca</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    modalProdutosFiltrados.forEach((produto, index) => {
        const selectedClass = index === modalProdutoSelecionadoIndex ? 'bg-blue-100 border-blue-500' : '';
        
        // Determinar estoque status
        let estoqueClass = '';
        let estoqueText = '';
        
        if (produto.estoque_atual !== undefined) {
            if (produto.estoque_atual <= 0) {
                estoqueClass = 'text-red-600 font-bold';
                estoqueText = 'ESGOTADO';
            } else if (produto.estoque_minimo && produto.estoque_atual <= produto.estoque_minimo) {
                estoqueClass = 'text-orange-600 font-bold';
                estoqueText = 'BAIXO';
            } else {
                estoqueClass = 'text-green-600';
                estoqueText = `${produto.estoque_atual} em estoque`;
            }
        }
        
        html += `
            <div class="flex items-center gap-4 p-3 border rounded-lg hover:bg-blue-50 cursor-pointer produto-item ${selectedClass}" 
                 data-index="${index}" 
                 onclick="selecionarProdutoModal(${index})"
                 ondblclick="selecionarProdutoParaQuantidade(${index})"
                 onmouseenter="this.classList.add('bg-blue-50')"
                 onmouseleave="this.classList.remove('bg-blue-50')">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-blue-600 text-sm">#${produto.codigo || '???'}</span>
                        <span class="font-medium">${produto.descricao}</span>
                        ${produto.cor ? `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${produto.cor}</span>` : ''}
                    </div>
                    <div class="text-sm text-gray-600 grid grid-cols-2 gap-x-4 mt-1">
                        <div>
                            ${produto.categoria ? `<span class="text-xs bg-blue-50 px-2 py-0.5 rounded mr-2">${produto.categoria}</span>` : ''}
                            ${produto.marca ? `<span class="text-xs">🏷️ ${produto.marca}</span>` : ''}
                        </div>
                        <div class="text-right">
                            <span class="font-medium">${formatarValorReais(produto.valor_base)}</span>
                            ${produto.unidade ? `<span class="text-xs text-gray-500">/${produto.unidade}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs mt-1">
                        ${produto.codigo_barras ? `<span class="text-gray-500">📊 ${produto.codigo_barras}</span>` : ''}
                        ${estoqueText ? `<span class="${estoqueClass}">📦 ${estoqueText}</span>` : ''}
                        ${produto.localizacao ? `<span class="text-gray-500">📍 ${produto.localizacao}</span>` : ''}
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
    
    container.innerHTML = html;
    
    // Mostrar contagem de resultados
    if (modalProdutosFiltrados.length > 0) {
        const infoEl = document.createElement('div');
        infoEl.className = 'text-xs text-gray-500 text-center mt-2';
        infoEl.innerText = `${modalProdutosFiltrados.length} produto(s) encontrado(s)`;
        container.appendChild(infoEl);
    }
}

function selecionarProdutoModal(index) {
    if (index < 0 || index >= modalProdutosFiltrados.length) return;
    
    modalProdutoSelecionadoIndex = index;
    
    // Atualizar visual da seleção
    document.querySelectorAll('.produto-item').forEach(item => {
        item.classList.remove('bg-blue-100', 'border-blue-500');
    });
    
    const selectedItem = document.querySelector(`.produto-item[data-index="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add('bg-blue-100', 'border-blue-500');
        
        // Rolar para o item selecionado
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function selecionarProdutoParaQuantidade(index) {
    if (index < 0 || index >= modalProdutosFiltrados.length) return;
    
    const produto = modalProdutosFiltrados[index];
    if (!produto) return;
    
    // Verificar estoque
    if (produto.estoque_atual !== undefined && produto.estoque_atual <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Produto sem estoque',
            text: `O produto ${produto.descricao} está sem estoque!`,
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    // Focar no campo de quantidade
    const qtdInput = document.getElementById(`qtd-rapida-${index}`);
    if (qtdInput) {
        qtdInput.focus();
        qtdInput.select();
        aguardandoQuantidade = true;
        produtoParaAdicionar = { produto, index };
    }
}

function quantidadeKeyDown(event, index) {
    if (event.key === 'Enter') {
        event.preventDefault();
        
        const produto = modalProdutosFiltrados[index];
        if (!produto) return;
        
        const quantidadeInput = document.getElementById(`qtd-rapida-${index}`);
        const quantidade = quantidadeInput ? parseInt(quantidadeInput.value) || 1 : 1;
        
        // Verificar estoque
        if (produto.estoque_atual !== undefined && quantidade > produto.estoque_atual) {
            Swal.fire({
                icon: 'warning',
                title: 'Quantidade maior que estoque',
                text: `Estoque atual: ${produto.estoque_atual} ${produto.unidade || 'un'}`,
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        
        adicionarProdutoNaTabela(produto, quantidade);
        
        // Limpar estados
        aguardandoQuantidade = false;
        produtoParaAdicionar = null;
        
        // Voltar para busca
        const buscaInput = document.getElementById('busca-produtos-modal');
        const termoAtual = buscaInput ? buscaInput.value : '';
        
        if (termoAtual && termoAtual.length >= 2) {
            setTimeout(() => {
                filtrarProdutosModal(termoAtual);
            }, 50);
        } else {
            renderizarListaProdutosVazia();
        }
        
        setTimeout(() => {
            if (buscaInput) {
                buscaInput.focus();
                buscaInput.select();
            }
        }, 100);
    }
}

function filtrarProdutosModal(termo) {
    // Limpar timeout anterior
    if (buscaTimeout) {
        clearTimeout(buscaTimeout);
    }
    
    // Se termo tem menos de 2 caracteres, não buscar
    if (!termo || termo.length < 2) {
        modalProdutosFiltrados = [];
        modalProdutoSelecionadoIndex = -1;
        renderizarListaProdutosVazia();
        return;
    }
    
    // Pequeno delay para não buscar a cada tecla (debounce)
    buscaTimeout = setTimeout(() => {
        const termoLower = termo.toLowerCase();
        
        // Busca em múltiplos campos
        modalProdutosFiltrados = window.bancoProdutos.filter(p => {
            // Busca por código
            if (p.codigo && p.codigo.toString().includes(termoLower)) return true;
            
            // Busca por código de barras
            if (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termoLower)) return true;
            
            // Busca por descrição
            if (p.descricao && p.descricao.toLowerCase().includes(termoLower)) return true;
            
            // Busca por fornecedor
            if (p.fornecedor && p.fornecedor.toLowerCase().includes(termoLower)) return true;
            
            // Busca por categoria
            if (p.categoria && p.categoria.toLowerCase().includes(termoLower)) return true;
            
            // Busca por cor
            if (p.cor && p.cor.toLowerCase().includes(termoLower)) return true;
            
            // Busca por marca
            if (p.marca && p.marca.toLowerCase().includes(termoLower)) return true;
            
            return false;
        });
        
        // Limitar a 50 resultados para não ficar lento
        if (modalProdutosFiltrados.length > 50) {
            modalProdutosFiltrados = modalProdutosFiltrados.slice(0, 50);
        }
        
        // Ordenar por código
        modalProdutosFiltrados.sort((a, b) => {
            const codA = parseInt(a.codigo) || 0;
            const codB = parseInt(b.codigo) || 0;
            return codA - codB;
        });
        
        modalProdutoSelecionadoIndex = modalProdutosFiltrados.length > 0 ? 0 : -1;
        renderizarListaProdutosResultados();
        
        // Se tiver resultados, seleciona o primeiro automaticamente
        if (modalProdutosFiltrados.length > 0) {
            selecionarProdutoModal(0);
        }
    }, 300);
}

function adicionarProdutoRapido(index) {
    selecionarProdutoParaQuantidade(index);
}

function adicionarProdutoNaTabela(produto, quantidade) {
    const tbody = document.getElementById('tabela-itens');
    
    // Remove a linha "Nenhum item adicionado" se existir
    const mensagemVazia = tbody.querySelector('tr td[colspan="6"]');
    if (mensagemVazia && mensagemVazia.innerText.includes('Nenhum item adicionado')) {
        mensagemVazia.closest('tr').remove();
    }
    
    // Remove QUALQUER linha de adicionar manual que possa existir
    const linhaAdicionar = document.getElementById('linha-adicionar');
    if (linhaAdicionar) {
        linhaAdicionar.remove();
    }
    
    // Cria nova linha na tabela
    const novaLinha = document.createElement('tr');
    novaLinha.className = 'text-sm';
    
    const selectId = 'produto-select-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    
    // Monta o select com o produto pré-selecionado
    let selectHtml = `<select id="${selectId}" class="w-full p-1 border rounded desc-item border-blue-300 focus:ring-2 focus:ring-blue-500 bg-gray-50 produto-select" style="width: 100%;" onchange="window.preencherProduto(this)">`;
    selectHtml += '<option value="">Selecione um produto</option>';
    
    if (window.bancoProdutos && window.bancoProdutos.length > 0) {
        window.bancoProdutos.forEach(p => {
            // Comparação robusta: normaliza strings (remove espaços extras e compara case insensitive)
            const produtoDescNormalizada = produto.descricao ? produto.descricao.trim().toLowerCase() : '';
            const pDescNormalizada = p.descricao ? p.descricao.trim().toLowerCase() : '';
            const selected = (pDescNormalizada === produtoDescNormalizada) ? 'selected' : '';
            
            selectHtml += `<option value="${p.descricao}" data-valor="${p.valor_base}" data-forn="${p.fornecedor || ''}" ${selected}>${p.codigo ? '#' + p.codigo + ' - ' : ''}${p.descricao} - ${formatarValorReais(p.valor_base)}</option>`;
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
    
    tbody.appendChild(novaLinha);
    
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
    fecharModalItens();
}

// ==========================================
// FUNÇÃO PARA GERAR PRÓXIMO CÓDIGO DE PRODUTO
// ==========================================

function gerarProximoCodigoProduto() {
    if (!window.bancoProdutos || window.bancoProdutos.length === 0) {
        return '001';
    }
    
    // Encontrar o maior código numérico
    let maxCodigo = 0;
    window.bancoProdutos.forEach(p => {
        if (p.codigo) {
            const num = parseInt(p.codigo);
            if (!isNaN(num) && num > maxCodigo) {
                maxCodigo = num;
            }
        }
    });
    
    // Incrementar e formatar com 3 dígitos
    const proximo = maxCodigo + 1;
    return proximo.toString().padStart(3, '0');
}

// ==========================================
// FUNÇÃO PARA NAVEGAÇÃO POR ENTER NO MODAL
// ==========================================

function setupEnterNavigation(modal) {
    const inputs = modal.querySelectorAll('input, select, textarea');
    
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Se for o último campo, dispara o botão de salvar
                if (index === inputs.length - 1) {
                    const confirmButton = modal.querySelector('.swal2-confirm');
                    if (confirmButton) confirmButton.click();
                } else {
                    // Foca no próximo campo
                    const nextInput = inputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                        if (nextInput.type === 'text' || nextInput.type === 'number' || nextInput.tagName === 'TEXTAREA') {
                            nextInput.select();
                        }
                    }
                }
            }
        });
    });
}

// ==========================================
// FUNÇÃO PARA ABRIR CADASTRO COMPLETO DE PRODUTO
// ==========================================

function abrirCadastroCompletoProduto(produtoId = null) {
    const produto = produtoId ? window.bancoProdutos.find(p => p.id === produtoId) : null;
    
    let categorias = [];
    if (window.bancoProdutos) {
        categorias = [...new Set(window.bancoProdutos.map(p => p.categoria).filter(c => c))];
    }
    
    let marcas = [];
    if (window.bancoProdutos) {
        marcas = [...new Set(window.bancoProdutos.map(p => p.marca).filter(m => m))];
    }
    
    // Gerar código automático para novo produto
    const codigoAutomatico = produto ? produto.codigo : gerarProximoCodigoProduto();
    
    Swal.fire({
        title: produto ? '✏️ Editar Produto' : '➕ Novo Produto',
        html: `
            <div class="text-left space-y-3 max-h-[60vh] overflow-y-auto p-2">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs font-medium">Código Interno *</label>
                        <input id="swal-prod-codigo" class="w-full p-2 border rounded text-sm bg-gray-100 cursor-not-allowed" value="${codigoAutomatico}" readonly tabindex="-1">
                        <p class="text-xs text-gray-500 mt-1">🔒 Automático</p>
                    </div>
                    <div>
                        <label class="text-xs font-medium">Código de Barras</label>
                        <input id="swal-prod-codigo-barras" class="w-full p-2 border rounded text-sm" value="${produto ? produto.codigo_barras || '' : ''}" placeholder="789...">
                    </div>
                </div>
                
                <div>
                    <label class="text-xs font-medium">Descrição do Produto *</label>
                    <input id="swal-prod-descricao" class="w-full p-2 border rounded text-sm" value="${produto ? produto.descricao || '' : ''}" placeholder="Ex: Porta de Madeira">
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs font-medium">Categoria</label>
                        <input id="swal-prod-categoria" class="w-full p-2 border rounded text-sm" value="${produto ? produto.categoria || '' : ''}" placeholder="Ex: Portas" list="categorias-list">
                        <datalist id="categorias-list">
                            ${categorias.map(c => `<option value="${c}">`).join('')}
                        </datalist>
                    </div>
                    <div>
                        <label class="text-xs font-medium">Marca / Fabricante</label>
                        <input id="swal-prod-marca" class="w-full p-2 border rounded text-sm" value="${produto ? produto.marca || '' : ''}" placeholder="Ex: Tramontina" list="marcas-list">
                        <datalist id="marcas-list">
                            ${marcas.map(m => `<option value="${m}">`).join('')}
                        </datalist>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="text-xs font-medium">Fornecedor</label>
                        <input id="swal-prod-fornecedor" class="w-full p-2 border rounded text-sm" value="${produto ? produto.fornecedor || '' : ''}" placeholder="Fornecedor">
                    </div>
                    <div>
                        <label class="text-xs font-medium">Cor</label>
                        <input id="swal-prod-cor" class="w-full p-2 border rounded text-sm" value="${produto ? produto.cor || '' : ''}" placeholder="Ex: Branco">
                    </div>
                    <div>
                        <label class="text-xs font-medium">Unidade</label>
                        <select id="swal-prod-unidade" class="w-full p-2 border rounded text-sm">
                            <option value="UN" ${produto && produto.unidade === 'UN' ? 'selected' : ''}>UN - Unidade</option>
                            <option value="M2" ${produto && produto.unidade === 'M2' ? 'selected' : ''}>M² - Metro Quadrado</option>
                            <option value="MT" ${produto && produto.unidade === 'MT' ? 'selected' : ''}>MT - Metro Linear</option>
                            <option value="KIT" ${produto && produto.unidade === 'KIT' ? 'selected' : ''}>KIT - Kit</option>
                            <option value="CX" ${produto && produto.unidade === 'CX' ? 'selected' : ''}>CX - Caixa</option>
                            <option value="PC" ${produto && produto.unidade === 'PC' ? 'selected' : ''}>PC - Peça</option>
                            <option value="KG" ${produto && produto.unidade === 'KG' ? 'selected' : ''}>KG - Quilograma</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs font-medium">Preço de Custo (R$)</label>
                        <input id="swal-prod-custo" class="w-full p-2 border rounded text-sm text-right" value="${produto && produto.custo ? produto.custo.toFixed(2).replace('.', ',') : '0,00'}" onkeyup="formatarValorInput(this)">
                    </div>
                    <div>
                        <label class="text-xs font-medium">Preço de Venda (R$) *</label>
                        <input id="swal-prod-valor" class="w-full p-2 border rounded text-sm text-right font-bold text-blue-600" value="${produto ? produto.valor_base.toFixed(2).replace('.', ',') : '0,00'}" onkeyup="formatarValorInput(this)">
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs font-medium">Peso (kg)</label>
                        <input id="swal-prod-peso" type="number" step="0.01" class="w-full p-2 border rounded text-sm" value="${produto ? produto.peso || '' : ''}" placeholder="0.00">
                    </div>
                    <div>
                        <label class="text-xs font-medium">Dimensões (AxLxP)</label>
                        <input id="swal-prod-dimensoes" class="w-full p-2 border rounded text-sm" value="${produto ? produto.dimensoes || '' : ''}" placeholder="200x80x5 cm">
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs font-medium">Localização</label>
                        <input id="swal-prod-localizacao" class="w-full p-2 border rounded text-sm" value="${produto ? produto.localizacao || '' : ''}" placeholder="Ex: Corredor A, Prateleira 3">
                    </div>
                    <div>
                        <label class="text-xs font-medium">Estoque Mínimo</label>
                        <input id="swal-prod-estoque-min" type="number" min="0" class="w-full p-2 border rounded text-sm" value="${produto && produto.estoque_minimo !== undefined ? produto.estoque_minimo : '0'}">
                    </div>
                </div>
                
                <div>
                    <label class="text-xs font-medium">Estoque Atual</label>
                    <input id="swal-prod-estoque-atual" type="number" min="0" class="w-full p-2 border rounded text-sm" value="${produto && produto.estoque_atual !== undefined ? produto.estoque_atual : '0'}">
                </div>
                
                <div>
                    <label class="text-xs font-medium">Observações</label>
                    <textarea id="swal-prod-obs" class="w-full p-2 border rounded text-sm" rows="2">${produto ? produto.observacoes || '' : ''}</textarea>
                </div>
                
                <div class="text-xs text-gray-500 text-center pt-2 border-t">
                    <span>⏎ ENTER para navegar entre os campos</span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: produto ? '💾 Atualizar' : '✅ Cadastrar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        width: '700px',
        didOpen: (modal) => {
            // Focar no primeiro campo editável (descrição)
            setTimeout(() => {
                document.getElementById('swal-prod-descricao').focus();
            }, 100);
            
            // Configurar navegação por ENTER
            setupEnterNavigation(modal);
        },
        preConfirm: () => {
            // Validar campos obrigatórios
            const codigo = document.getElementById('swal-prod-codigo').value.trim();
            const descricao = document.getElementById('swal-prod-descricao').value.trim();
            const valorTexto = document.getElementById('swal-prod-valor').value;
            
            if (!codigo) {
                Swal.showValidationMessage('Código é obrigatório');
                return false;
            }
            
            if (!descricao) {
                Swal.showValidationMessage('Descrição é obrigatória');
                return false;
            }
            
            const valor = parseFloat(valorTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            
            if (valor <= 0) {
                Swal.showValidationMessage('Preço de venda deve ser maior que zero');
                return false;
            }
            
            // Verificar se código já existe (em outro produto)
            if (window.bancoProdutos) {
                const codigoExiste = window.bancoProdutos.some(p => 
                    p.codigo === codigo && p.id !== (produto ? produto.id : null)
                );
                if (codigoExiste) {
                    Swal.showValidationMessage(`Código ${codigo} já está em uso!`);
                    return false;
                }
            }
            
            return {
                codigo: codigo,
                codigo_barras: document.getElementById('swal-prod-codigo-barras').value.trim(),
                descricao: descricao,
                categoria: document.getElementById('swal-prod-categoria').value.trim(),
                marca: document.getElementById('swal-prod-marca').value.trim(),
                fornecedor: document.getElementById('swal-prod-fornecedor').value.trim(),
                cor: document.getElementById('swal-prod-cor').value.trim(),
                unidade: document.getElementById('swal-prod-unidade').value,
                custo: parseFloat(document.getElementById('swal-prod-custo').value.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
                valor_base: valor,
                peso: document.getElementById('swal-prod-peso').value ? parseFloat(document.getElementById('swal-prod-peso').value) : null,
                dimensoes: document.getElementById('swal-prod-dimensoes').value.trim(),
                localizacao: document.getElementById('swal-prod-localizacao').value.trim(),
                estoque_minimo: parseInt(document.getElementById('swal-prod-estoque-min').value) || 0,
                estoque_atual: parseInt(document.getElementById('swal-prod-estoque-atual').value) || 0,
                observacoes: document.getElementById('swal-prod-obs').value.trim()
            };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Verificar se as funções do Firebase estão disponíveis
                if (!window.db) {
                    console.error('Firebase não está disponível');
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: 'Firebase não está disponível. Recarregue a página.',
                        confirmButtonColor: '#3b82f6'
                    });
                    return;
                }
                
                if (produto) {
                    // Atualizar
                    const docRef = window.doc(window.db, "produtos", produto.id);
                    await window.updateDoc(docRef, result.value);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Produto atualizado!',
                        text: `${result.value.codigo} - ${result.value.descricao}`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    // Cadastrar novo
                    const collectionRef = window.collection(window.db, "produtos");
                    await window.addDoc(collectionRef, {
                        ...result.value,
                        data_cadastro: window.serverTimestamp()
                    });
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Produto cadastrado!',
                        text: `${result.value.codigo} - ${result.value.descricao}`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
                
                // Recarregar dados
                if (typeof window.carregarMemoriaBanco === 'function') {
                    await window.carregarMemoriaBanco();
                }
                
            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Erro ao salvar produto: ' + error.message,
                    confirmButtonColor: '#3b82f6'
                });
            }
        }
    });
}

// ==========================================
// EVENTOS DE TECLADO GLOBAL
// ==========================================

// Remover event listener antigo e adicionar novo
document.removeEventListener('keydown', handleModalKeyDown);
document.addEventListener('keydown', handleModalKeyDown);

function handleModalKeyDown(event) {
    const modal = document.getElementById('modal-itens');
    if (!modal || modal.classList.contains('hidden')) return;
    
    const buscaInput = document.getElementById('busca-produtos-modal');
    const isBuscaFocused = document.activeElement === buscaInput;
    
    // ESC fecha o modal
    if (event.key === 'Escape') {
        fecharModalItens();
        event.preventDefault();
        return;
    }
    
    // Se está aguardando quantidade, não faz navegação na lista
    if (aguardandoQuantidade) return;
    
    // Seta para baixo - navegar na lista
    if (event.key === 'ArrowDown' && isBuscaFocused && modalProdutosFiltrados.length > 0) {
        event.preventDefault();
        let novoIndex = modalProdutoSelecionadoIndex + 1;
        if (novoIndex >= modalProdutosFiltrados.length) {
            novoIndex = 0;
        }
        selecionarProdutoModal(novoIndex);
    }
    
    // Seta para cima - navegar na lista
    if (event.key === 'ArrowUp' && isBuscaFocused && modalProdutosFiltrados.length > 0) {
        event.preventDefault();
        let novoIndex = modalProdutoSelecionadoIndex - 1;
        if (novoIndex < 0) {
            novoIndex = modalProdutosFiltrados.length - 1;
        }
        selecionarProdutoModal(novoIndex);
    }
    
    // ENTER no campo de busca - selecionar item para quantidade
    if (event.key === 'Enter' && isBuscaFocused && modalProdutoSelecionadoIndex >= 0) {
        event.preventDefault();
        selecionarProdutoParaQuantidade(modalProdutoSelecionadoIndex);
    }
}

// ==========================================
// FUNÇÃO PARA NOVO PEDIDO (CORRIGIDA)
// ==========================================
window.novoPedido = function() {
    console.log('➕ Iniciando novo pedido - reset completo');
    
    bloquearCampos(false);
    document.getElementById('aviso-bloqueio').classList.add('hidden');
    
    document.getElementById('pedido-id-atual').value = '';
    
    const selectCliente = document.getElementById('input-cliente');
    if (selectCliente) {
        if ($.fn.select2) {
            $(selectCliente).val('').trigger('change');
        } else {
            selectCliente.value = '';
        }
    }
    
    document.getElementById('input-endereco').value = '';
    document.getElementById('dados-cliente-container').classList.add('hidden');
    
    document.getElementById('input-km').value = '';
    document.getElementById('input-litro').value = '4.20';
    document.getElementById('input-consumo').value = '9.0';
    document.getElementById('input-pedagio').value = '0,00';
    
    document.getElementById('input-desconto').value = '0';
    document.getElementById('input-acrescimo').value = '0,00';
    document.getElementById('input-motivo-acrescimo').value = '';
    
    document.getElementById('select-pagamento').value = 'Pix';
    document.getElementById('select-condicao-pagamento').value = 'Vista';
    document.getElementById('div-parcelas-personalizado').classList.add('hidden');
    document.getElementById('input-primeiro-vencimento').value = '';
    
    document.getElementById('input-previsao').value = '';
    document.getElementById('pdf-n-display').innerText = '';
    
    document.getElementById('custo-combustivel').innerText = 'R$ 0,00';
    document.getElementById('custo-pedagio').innerText = 'R$ 0,00';
    document.getElementById('custo-total-frete').innerText = 'R$ 0,00';
    document.getElementById('display-frete-estimado').value = 'R$ 0,00';
    document.getElementById('display-subtotal').innerText = 'Subtotal: R$ 0,00';
    document.getElementById('display-desconto').innerText = 'Desconto: - R$ 0,00';
    document.getElementById('display-acrescimo').innerText = 'Acréscimo: + R$ 0,00';
    document.getElementById('display-frete-final').innerText = 'Frete: R$ 0,00';
    document.getElementById('display-taxa-final').classList.add('hidden');
    document.getElementById('display-total').innerText = 'Total: R$ 0,00';
    document.getElementById('btn-gerar-pdf').setAttribute('data-total', '0,00');
    
    document.getElementById('btn-cancelar-pedido').classList.add('hidden');
    
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.innerHTML = '📦 Salvar Pedido';
    btnSalvar.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    btnSalvar.classList.add('bg-green-600', 'hover:bg-green-700');
    
    const selectStatus = document.getElementById('select-status');
    if (selectStatus) selectStatus.value = 'Orçamento';
    
    const botoes = document.querySelectorAll('[id^="status-"]');
    botoes.forEach(btn => {
        btn.classList.remove('border-yellow-500', 'bg-yellow-50', 'text-yellow-700',
            'border-blue-500', 'bg-blue-50', 'text-blue-700',
            'border-orange-500', 'bg-orange-50', 'text-orange-700',
            'border-green-500', 'bg-green-50', 'text-green-700');
        btn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-700');
    });
    
    const btnOrcamento = document.getElementById('status-orcamento');
    if (btnOrcamento) {
        btnOrcamento.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-700');
        btnOrcamento.classList.add('border-yellow-500', 'bg-yellow-50', 'text-yellow-700');
    }
    
    const barra = document.getElementById('progress-bar');
    const label = document.getElementById('status-label');
    if (barra) {
        barra.classList.remove('bg-blue-500', 'bg-orange-500', 'bg-green-500');
        barra.classList.add('bg-yellow-500');
        barra.style.width = '25%';
    }
    if (label) {
        label.innerHTML = 'Status: Orçamento - Orçamento';
    }
    
    // ===== TABELA DE ITENS VAZIA (CORRIGIDO) =====
    const tbody = document.getElementById('tabela-itens');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="p-4 text-center text-gray-500">
                Nenhum item adicionado. Clique em "Adicionar Itens" para começar.
            </td>
        </tr>
    `;
    
    // NÃO adicionamos nenhuma linha em branco ou botão manual
    
    window.calcularTudo();
    
    Swal.fire({
        icon: 'success',
        title: 'Novo pedido',
        text: 'Pedido iniciado! Comece selecionando um cliente.',
        timer: 2000,
        showConfirmButton: false
    });
};

// ==========================================
// FUNÇÃO PARA ABRIR PEDIDO PARA EDIÇÃO (CORRIGIDA)
// ==========================================
window.abrirPedidoParaEdicao = function(id) {
    console.log('🔍 Abrindo pedido para visualização/edição:', id);
    
    const pedido = window.bancoPedidos.find(x => x.id === id);
    if (!pedido) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Pedido não encontrado!',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }

    console.log('Pedido carregado:', pedido);
    console.log('Status do pedido:', pedido.status);
    console.log('Itens do pedido:', pedido.itens);

    const cliente = window.bancoClientes.find(c => c.id === pedido.cliente_id);
    
    bloquearCampos(false);
    document.getElementById('aviso-bloqueio').classList.add('hidden');
    
    document.getElementById('pedido-id-atual').value = pedido.id;
    
    const selectCliente = document.getElementById('input-cliente');
    if (selectCliente && pedido.cliente_nome) {
        if ($.fn.select2) {
            $(selectCliente).val(pedido.cliente_nome).trigger('change');
        } else {
            selectCliente.value = pedido.cliente_nome;
        }
    }
    
    document.getElementById('pdf-n-display').innerText = '#' + (pedido.numero_sequencial?.toString().padStart(3,'0') || '???');
    
    if (cliente) {
        document.getElementById('cliente-telefone').innerText = cliente.telefone || '-';
        document.getElementById('cliente-documento').innerText = cliente.documento || '-';
        document.getElementById('cliente-endereco').innerText = cliente.endereco || '-';
        document.getElementById('cliente-cep').innerText = cliente.cep || '-';
        document.getElementById('dados-cliente-container').classList.remove('hidden');
        document.getElementById('input-endereco').value = cliente.endereco || '';
    }
    
    document.getElementById('btn-cancelar-pedido').classList.remove('hidden');
    atualizarTextoBotaoSalvar('editando');
    
    // ==========================================
    // CARREGAR STATUS DO PEDIDO
    // ==========================================
    if (pedido.status) {
        const selectStatus = document.getElementById('select-status');
        if (selectStatus) {
            selectStatus.value = pedido.status;
            console.log('Status setado para:', pedido.status);
            
            // Atualizar botões de status
            const botoes = document.querySelectorAll('[id^="status-"]');
            botoes.forEach(btn => {
                btn.classList.remove('border-yellow-500', 'bg-yellow-50', 'text-yellow-700',
                    'border-blue-500', 'bg-blue-50', 'text-blue-700',
                    'border-orange-500', 'bg-orange-50', 'text-orange-700',
                    'border-green-500', 'bg-green-50', 'text-green-700');
                btn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-700');
            });
            
            const statusMap = {
                'Orçamento': 'status-orcamento',
                'Produção': 'status-producao',
                'Em Entrega': 'status-entrega',
                'Entregue': 'status-entregue'
            };
            
            const btnId = statusMap[pedido.status];
            if (btnId) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-700');
                    if (pedido.status === 'Orçamento') {
                        btn.classList.add('border-yellow-500', 'bg-yellow-50', 'text-yellow-700');
                    } else if (pedido.status === 'Produção') {
                        btn.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
                    } else if (pedido.status === 'Em Entrega') {
                        btn.classList.add('border-orange-500', 'bg-orange-50', 'text-orange-700');
                    } else if (pedido.status === 'Entregue') {
                        btn.classList.add('border-green-500', 'bg-green-50', 'text-green-700');
                    }
                }
            }
            
            // Atualizar barra de progresso
            const progressos = {
                'Orçamento': { width: '25%', cor: 'bg-yellow-500', texto: 'Orçamento' },
                'Produção': { width: '50%', cor: 'bg-blue-500', texto: 'Em produção' },
                'Em Entrega': { width: '75%', cor: 'bg-orange-500', texto: 'Saiu para entrega' },
                'Entregue': { width: '100%', cor: 'bg-green-500', texto: 'Entregue' }
            };
            
            const prog = progressos[pedido.status] || progressos['Orçamento'];
            const barra = document.getElementById('progress-bar');
            const label = document.getElementById('status-label');
            
            if (barra) {
                barra.classList.remove('bg-yellow-500', 'bg-blue-500', 'bg-orange-500', 'bg-green-500');
                barra.classList.add(prog.cor);
                barra.style.width = prog.width;
            }
            if (label) {
                label.innerHTML = `Status: ${pedido.status} - ${prog.texto}`;
            }
        }
    }
    
    // Bloquear campos se necessário
    const statusBloqueados = ['Produção', 'Em Entrega', 'Entregue'];
    if (statusBloqueados.includes(pedido.status)) {
        bloquearCampos(true);
        const aviso = document.getElementById('aviso-bloqueio');
        const spanStatus = document.getElementById('status-bloqueio');
        if (aviso && spanStatus) {
            spanStatus.innerText = pedido.status;
            aviso.classList.remove('hidden');
        }
    }
    
    // Dados do frete
    if (pedido.frete) {
        document.getElementById('input-km').value = pedido.frete.distancia || '0';
        document.getElementById('input-litro').value = pedido.frete.preco_combustivel || '4.20';
        document.getElementById('input-consumo').value = pedido.frete.consumo || '9.0';
        
        let pedagio = pedido.frete.pedagio || 0;
        document.getElementById('input-pedagio').value = pedagio.toFixed(2).replace('.', ',');
        
        if (pedido.frete.custo_combustivel) {
            document.getElementById('custo-combustivel').innerText = pedido.frete.custo_combustivel;
        }
        if (pedido.frete.custo_total) {
            document.getElementById('custo-total-frete').innerText = pedido.frete.custo_total;
        }
    }
    
    // Descontos e acréscimos
    if (pedido.desconto) document.getElementById('input-desconto').value = pedido.desconto;
    if (pedido.acrescimo) document.getElementById('input-acrescimo').value = pedido.acrescimo.toFixed(2).replace('.', ',');
    if (pedido.motivo_acrescimo) document.getElementById('input-motivo-acrescimo').value = pedido.motivo_acrescimo;
    
    // Condições de pagamento
    if (pedido.condicao_pagamento) {
        document.getElementById('select-condicao-pagamento').value = pedido.condicao_pagamento;
        if (pedido.condicao_pagamento === 'Personalizado') {
            document.getElementById('div-parcelas-personalizado').classList.remove('hidden');
        }
    }
    
    if (pedido.primeiro_vencimento) {
        document.getElementById('input-primeiro-vencimento').value = pedido.primeiro_vencimento;
    }
    
    // ==========================================
    // CARREGAR ITENS DO PEDIDO (CORRIGIDO)
    // ==========================================
    const tbody = document.getElementById('tabela-itens');
    tbody.innerHTML = '';

    if (pedido.itens && pedido.itens.length > 0) {
        console.log(`📦 Carregando ${pedido.itens.length} itens do pedido`);
        
        pedido.itens.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, item);
            
            // Processar valor unitário
            let valorUnitario = 0;
            
            if (typeof item.valor_unitario === 'string') {
                valorUnitario = item.valor_unitario
                    .replace('R$', '')
                    .trim()
                    .replace('.', '')
                    .replace(',', '.');
                valorUnitario = parseFloat(valorUnitario);
            } 
            else if (typeof item.valor_unitario === 'number') {
                valorUnitario = item.valor_unitario;
            }
            
            if (isNaN(valorUnitario)) {
                console.warn(`⚠️ Valor unitário inválido para item ${index + 1}, usando 0`);
                valorUnitario = 0;
            }
            
            const tr = document.createElement('tr'); 
            tr.className = 'text-sm';
            
            const selectId = 'produto-select-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substr(2, 5);
            
            // Montar select com comparação robusta
            let selectHtml = `<select id="${selectId}" class="w-full p-1 border rounded desc-item border-blue-300 focus:ring-2 focus:ring-blue-500 bg-gray-50 produto-select" style="width: 100%;" onchange="window.preencherProduto(this)">`;
            selectHtml += '<option value="">Selecione um produto</option>';
            
            const descricaoItemNormalizada = item.descricao ? item.descricao.trim().toLowerCase() : '';
            
            window.bancoProdutos.forEach(p => {
                const descricaoProdutoNormalizada = p.descricao ? p.descricao.trim().toLowerCase() : '';
                // Comparação case-insensitive e trim
                const selected = (descricaoProdutoNormalizada === descricaoItemNormalizada) ? 'selected' : '';
                
                selectHtml += `<option value="${p.descricao}" data-valor="${p.valor_base}" data-forn="${p.fornecedor || ''}" ${selected}>${p.codigo ? '#' + p.codigo + ' - ' : ''}${p.descricao} - ${window.formatarValorReais(p.valor_base)}</option>`;
            });
            
            selectHtml += '</select>';
            
            const valorFormatado = window.formatarValorReais(valorUnitario);
            
            tr.innerHTML = `
                <td class="p-2 border"><input type="number" value="${item.quantidade || 1}" class="w-16 p-1 border rounded qtd-item" onchange="window.calcularTudo()"></td>
                <td class="p-2 border">${selectHtml}</td>
                <td class="p-2 border"><input type="text" value="${item.fornecedor || ''}" class="w-full p-1 border rounded forn-item bg-gray-100" readonly></td>
                <td class="p-2 border"><input type="text" value="${valorFormatado}" class="w-24 p-1 border rounded valor-item bg-gray-100 text-right" readonly></td>
                <td class="p-2 border total-linha">R$ 0,00</td>
                <td class="p-2 border text-center"><button onclick="if(window.podeEditarPedido()) { this.closest('tr').remove(); window.calcularTudo(); } else { Swal.fire({ icon: 'error', title: 'Ação bloqueada', text: '❌ Não é possível remover itens de um pedido em andamento!', confirmButtonColor: '#3b82f6' }); }" class="text-red-500 font-bold">X</button></td>
            `;
            
            tbody.appendChild(tr);
        });
    } else {
        // Se não tem itens, mostra mensagem
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="6" class="p-4 text-center text-gray-500">
                Nenhum item adicionado. Clique em "Adicionar Itens" para começar.
            </td>
        `;
        tbody.appendChild(tr);
    }

    // REMOVIDO: Não adicionamos linha de adicionar manual

    // Inicializar Select2
    setTimeout(() => {
        document.querySelectorAll('.produto-select').forEach(select => {
            if ($.fn.select2) {
                $(select).select2({
                    placeholder: "Busque um produto...",
                    allowClear: true,
                    width: '100%'
                });
            }
        });
    }, 100);

    window.mostrarAba('aba-cadastro');

    setTimeout(() => {
        console.log('🔄 Chamando window.calcularTudo()...');
        window.calcularTudo();
    }, 500);
};

// ==========================================
// NAVEGAÇÃO
// ==========================================

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

// ==========================================
// FORMATAÇÃO
// ==========================================

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

// ==========================================
// FUNÇÃO ADICIONAR LINHA (DESATIVADA)
// ==========================================
function adicionarLinha() {
    console.log('Função adicionarLinha não é mais utilizada');
    // Não faz nada - mantida apenas para compatibilidade
}

function podeEditarPedido() {
    const statusAtual = document.getElementById('select-status')?.value || 'Orçamento';
    const statusBloqueados = ['Produção', 'Em Entrega', 'Entregue'];
    return !statusBloqueados.includes(statusAtual);
}

// ==========================================
// CÁLCULOS
// ==========================================

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

// ==========================================
// PDF
// ==========================================

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

// ==========================================
// EXPORTA FUNÇÕES PARA USO GLOBAL
// ==========================================
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
window.abrirCadastroCompletoProduto = abrirCadastroCompletoProduto;
window.novoPedido = window.novoPedido;
window.abrirPedidoParaEdicao = window.abrirPedidoParaEdicao;

// Funções do modal
window.abrirModalItens = abrirModalItens;
window.fecharModalItens = fecharModalItens;
window.adicionarProdutosSelecionados = adicionarProdutosSelecionados;
window.filtrarProdutosModal = filtrarProdutosModal;
window.selecionarProdutoModal = selecionarProdutoModal;
window.selecionarProdutoParaQuantidade = selecionarProdutoParaQuantidade;
window.adicionarProdutoRapido = adicionarProdutoRapido;
window.quantidadeKeyDown = quantidadeKeyDown;