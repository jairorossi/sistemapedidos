// ==========================================
// scripts.js - Funções globais do MPLEÃO
// ==========================================

// ---------- Navegação ----------
function mostrarAba(abaId) {
    const abas = ['aba-cadastro', 'aba-clientes', 'aba-produtos', 'aba-logistica', 'aba-financeiro'];
    abas.forEach(aba => document.getElementById(aba).classList.add('hidden'));
    document.getElementById(abaId).classList.remove('hidden');
    
    const botoes = ['btn-cadastro', 'btn-clientes', 'btn-produtos', 'btn-logistica', 'btn-financeiro'];
    botoes.forEach(btn => document.getElementById(btn).classList.remove('bg-gray-700'));
    document.getElementById('btn-' + abaId.split('-')[1]).classList.add('bg-gray-700');
    
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
    let numero = input.value.replace(/\D/g, '');
    
    if (numero.length <= 10) {
        numero = numero.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
        numero = numero.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    input.value = numero;
}

function formatarValorInput(input) {
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
    const linhaAdicionar = document.getElementById('linha-adicionar');
    
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
        <td class="p-2 border text-center"><button onclick="if(podeEditarPedido()) { this.closest('tr').remove(); calcularTudo(); } else { Swal.fire({ icon: 'error', title: 'Ação bloqueada', text: '❌ Não é possível remover itens de um pedido em andamento!', confirmButtonColor: '#3b82f6' }); }" class="text-red-500 font-bold hover:text-red-700">X</button></td>
    `;
    
    tbody.insertBefore(novaLinha, linhaAdicionar);
    
    const select = document.getElementById(selectId);
    if (select && window.bancoProdutos) {
        window.bancoProdutos.forEach(p => {
            const option = document.createElement('option');
            option.value = p.descricao;
            option.setAttribute('data-valor', p.valor_base);
            option.setAttribute('data-forn', p.fornecedor || '');
            option.textContent = `${p.descricao} - ${formatarValorReais(p.valor_base)}`;
            select.appendChild(option);
        });
        
        if ($.fn.select2) {
            $(select).select2({
                placeholder: "Busque um produto...",
                allowClear: true,
                width: '100%'
            });
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

    linhas.forEach((linha, index) => {
        const qtd = parseFloat(linha.querySelector('.qtd-item')?.value) || 0;
        const valorTexto = linha.querySelector('.valor-item')?.value || '0,00';
        
        const valor = parseFloat(valorTexto.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        
        const totalLinha = qtd * valor;
        linha.querySelector('.total-linha').innerText = formatarValorReais(totalLinha);
        subtotal += totalLinha;
    });

    const pctDesconto = parseFloat(document.getElementById('input-desconto').value.replace(',', '.')) || 0;
    const valorDesconto = subtotal * (pctDesconto / 100);
    const subtotalComDesconto = subtotal - valorDesconto;

    const acrescimoTexto = document.getElementById('input-acrescimo').value || '0,00';
    const acrescimo = parseFloat(acrescimoTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    const km = parseFloat(document.getElementById('input-km').value) || 0;
    const precoCombustivel = parseFloat(document.getElementById('input-litro').value) || 4.20;
    const consumo = parseFloat(document.getElementById('input-consumo').value) || 9.0;
    
    const custoCombustivel = km > 0 ? (km / consumo) * precoCombustivel : 0;
    
    let pedagio = 0;
    const pedagioInput = document.getElementById('input-pedagio').value;
    if (pedagioInput) {
        pedagio = parseFloat(pedagioInput.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }
    
    const frete = custoCombustivel + pedagio;
    
    document.getElementById('custo-combustivel').innerText = formatarValorReais(custoCombustivel);
    document.getElementById('custo-pedagio').innerText = formatarValorReais(pedagio);
    document.getElementById('custo-total-frete').innerText = formatarValorReais(frete);
    document.getElementById('display-frete-estimado').value = formatarValorReais(frete);

    const formaPgto = document.getElementById('select-pagamento').value;
    let taxaCartao = 0;
    if (formaPgto === 'Cartão de Crédito') {
        taxaCartao = (subtotalComDesconto + frete + acrescimo) * 0.05; 
        document.getElementById('info-taxa').innerText = `Taxa Maquininha (5%): ${formatarValorReais(taxaCartao)}`;
        document.getElementById('info-taxa').classList.remove('hidden');
    } else {
        document.getElementById('info-taxa').classList.add('hidden');
    }

    const totalGeral = subtotalComDesconto + frete + taxaCartao + acrescimo;

    document.getElementById('display-subtotal').innerText = 'Subtotal: ' + formatarValorReais(subtotal);
    document.getElementById('display-desconto').innerText = 'Desconto: - ' + formatarValorReais(valorDesconto);
    document.getElementById('display-acrescimo').innerText = 'Acréscimo: + ' + formatarValorReais(acrescimo);
    document.getElementById('display-frete-final').innerText = 'Frete: ' + formatarValorReais(frete);
    
    const displayTaxa = document.getElementById('display-taxa-final');
    if (taxaCartao > 0) {
        displayTaxa.innerText = 'Taxa Cartão: ' + formatarValorReais(taxaCartao);
        displayTaxa.classList.remove('hidden');
    } else {
        displayTaxa.classList.add('hidden');
    }

    document.getElementById('display-total').innerText = 'Total: ' + formatarValorReais(totalGeral);
    document.getElementById('btn-gerar-pdf').setAttribute('data-total', totalGeral.toFixed(2).replace('.', ','));
}

// ---------- PDF ----------
function gerarPDF() {
    const btn = document.getElementById('btn-gerar-pdf');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '✨ Gerando PDF...';

    const numeroExibicao = document.getElementById('pdf-n-display').innerText || 'NOVO';
    const cliente = document.getElementById('input-cliente').value || 'Não informado';
    const endereco = document.getElementById('input-endereco').value || 'Não informado';
    const previsao = document.getElementById('input-previsao').value || 'A combinar';
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const totalGeral = btn.getAttribute('data-total') || '0,00';

    let linhasHtml = '';
    document.querySelectorAll('#tabela-itens tr:not(#linha-adicionar)').forEach(linha => {
        const qtd = linha.querySelector('.qtd-item')?.value || '0';
        const select = linha.querySelector('.desc-item');
        const desc = select ? select.options[select.selectedIndex]?.text.split(' - ')[0] : '';
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