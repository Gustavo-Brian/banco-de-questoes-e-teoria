function randomizarLista(lista) {
    let indiceAtual = lista.length, indiceAleatorio;
    while (indiceAtual !== 0) {
        indiceAleatorio = Math.floor(Math.random() * indiceAtual);
        indiceAtual--;
        [lista[indiceAtual], lista[indiceAleatorio]] = [lista[indiceAleatorio], lista[indiceAtual]];
    }
}

async function carregarEConverterConteudoXML(numQuestoesDesejadas = 25) { // Adicionado parâmetro com default
    const caminhoDoXML = 'questoes.xml';

    try {
        const response = await fetch(caminhoDoXML);
        if (!response.ok) {
            throw new Error(`Erro ao carregar XML: ${response.status} ${response.statusText}`);
        }
        const xmlString = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            console.error("Erro ao analisar XML:", xmlDoc.getElementsByTagName("parsererror")[0].textContent);
            return { metadados: {}, secaoIntroducao: null, questoes: [] };
        }

        const atividadeXML = xmlDoc.getElementsByTagName("atividade")[0];
        if (!atividadeXML) {
            throw new Error("Elemento <atividade> não encontrado no XML.");
        }

        const dadosDoRecurso = {
            metadados: {},
            secaoIntroducao: null,
            questoes: []
        };

        const metadadosXML = atividadeXML.getElementsByTagName("metadados")[0];
        if (metadadosXML) {
            dadosDoRecurso.metadados.tituloRecurso = metadadosXML.getElementsByTagName("titulo")[0]?.textContent || "Atividade/Módulo";
            dadosDoRecurso.metadados.subtituloRecurso = metadadosXML.getElementsByTagName("subtitulo")[0]?.textContent || "";
            dadosDoRecurso.metadados.descricaoBreve = metadadosXML.getElementsByTagName("descricao_breve")[0]?.textContent || "";
            dadosDoRecurso.metadados.autor = metadadosXML.getElementsByTagName("autor")[0]?.textContent || "";
            dadosDoRecurso.metadados.dataCriacao = metadadosXML.getElementsByTagName("data_criacao")[0]?.textContent || "";
            dadosDoRecurso.metadados.nivelDificuldade = metadadosXML.getElementsByTagName("nivel_dificuldade")[0]?.textContent || "";
            dadosDoRecurso.metadados.idioma = metadadosXML.getElementsByTagName("idioma")[0]?.textContent || "";
        }

        const secaoIntroducaoXML = atividadeXML.getElementsByTagName("secao_introducao")[0];
        if (secaoIntroducaoXML) {
            dadosDoRecurso.secaoIntroducao = {
                id: secaoIntroducaoXML.getAttribute("id"),
                tituloSecao: secaoIntroducaoXML.getElementsByTagName("titulo")[0]?.textContent || "",
                paragrafos: Array.from(secaoIntroducaoXML.getElementsByTagName("paragrafo")).map(p => p.textContent)
            };
        }

        const todasAsQuestoesCarregadas = [];
        const secaoQuestoesXML = atividadeXML.getElementsByTagName("secao_questoes")[0];
        if (secaoQuestoesXML) {
            const questoesXML = secaoQuestoesXML.getElementsByTagName("questao");
            for (let i = 0; i < questoesXML.length; i++) {
                const questaoXML = questoesXML[i];
                const questao = {
                    pergunta: questaoXML.getElementsByTagName("pergunta")[0]?.textContent || "",
                    categoria: questaoXML.getElementsByTagName("categoria")[0]?.textContent || "",
                    dificuldade: questaoXML.getElementsByTagName("dificuldade")[0]?.textContent || "",
                    tipo: questaoXML.getElementsByTagName("tipo")[0]?.textContent || ""
                };

                if (questao.tipo === "multipla_escolha") {
                    questao.opcoes = Array.from(questaoXML.getElementsByTagName("opcoes")[0]?.getElementsByTagName("opcao") || []).map(opcaoXML => ({
                        id: opcaoXML.getAttribute("id"),
                        texto: opcaoXML.getElementsByTagName("texto")[0]?.textContent || "",
                        descricao: opcaoXML.getElementsByTagName("descricao")[0]?.textContent || ""
                    }));
                    const respostaCorretaXML = questaoXML.getElementsByTagName("respostaCorreta")[0];
                    if (respostaCorretaXML) {
                        questao.respostaCorretaId = respostaCorretaXML.getAttribute("idOpcao");
                    }
                } else if (questao.tipo === "verdadeiro_ou_falso") {
                    questao.opcoes = Array.from(questaoXML.getElementsByTagName("opcoes")[0]?.getElementsByTagName("opcao") || []).map(opcaoXML => ({
                        id: opcaoXML.getAttribute("id"),
                        texto: opcaoXML.getElementsByTagName("texto")[0]?.textContent || "",
                        descricao: opcaoXML.getElementsByTagName("descricao")[0]?.textContent || ""
                    }));
                    const respostaCorretaXML = questaoXML.getElementsByTagName("respostaCorreta")[0];
                    if (respostaCorretaXML) {
                        questao.respostaCorretaId = respostaCorretaXML.getAttribute("idOpcao");
                    }
                }

                todasAsQuestoesCarregadas.push(questao);
            }
        }

        randomizarLista(todasAsQuestoesCarregadas);
        // Usa numQuestoesDesejadas aqui
        dadosDoRecurso.questoes = todasAsQuestoesCarregadas.slice(0, numQuestoesDesejadas);

        return dadosDoRecurso;

    } catch (error) {
        console.error("Erro no carregamento/processamento do conteúdo XML:", error);
        return { metadados: { tituloRecurso: "Erro ao Carregar Conteúdo" }, secaoIntroducao: null, questoes: [] };
    }
}

function renderizarCardItem(itemData, container) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-item';
    cardDiv.setAttribute('data-tipo-item', itemData.tipo);

    if (itemData.tipo === "multipla_escolha" || itemData.tipo === "verdadeiro_ou_falso") {
        const pergunta = document.createElement('p');
        pergunta.textContent = itemData.pergunta;
        cardDiv.appendChild(pergunta);

        const opcoesDiv = document.createElement('div');
        opcoesDiv.className = 'opcoes-selecao';

        let shuffledOptions = [...itemData.opcoes];
        if (itemData.tipo === "multipla_escolha") {
            randomizarLista(shuffledOptions);
        }

        shuffledOptions.forEach(op => {
            const label = document.createElement('label');
            label.className = 'opcao-item';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `questao_${itemData.pergunta.replace(/\s+/g, '_').toLowerCase()}`;
            input.value = op.id;
            input.setAttribute('data-correta', op.id === itemData.respostaCorretaId);
            input.setAttribute('data-feedback', op.descricao);
            label.appendChild(input);
            const span = document.createElement('span');
            span.textContent = op.texto;
            label.appendChild(span);
            opcoesDiv.appendChild(label);
        });
        cardDiv.appendChild(opcoesDiv);

        const verificarBtn = document.createElement('button');
        verificarBtn.textContent = 'Verificar Resposta';
        verificarBtn.className = 'btn-verificar';
        verificarBtn.setAttribute('data-pergunta-hash', itemData.pergunta.replace(/\s+/g, '_').toLowerCase());

        verificarBtn.addEventListener('click', (event) => {
            const perguntaHash = event.target.getAttribute('data-pergunta-hash');
            const cardAtual = event.target.closest('.card-item');
            const selectedOption = cardAtual.querySelector(`input[name="questao_${perguntaHash}"]:checked`);

            let feedbackDiv = cardAtual.querySelector('.feedback-message');
            if (!feedbackDiv) {
                feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'feedback-message';
                cardAtual.appendChild(feedbackDiv);
            }

            if (selectedOption) {
                const isCorrect = selectedOption.getAttribute('data-correta') === 'true';
                const feedbackText = selectedOption.getAttribute('data-feedback');

                if (isCorrect) {
                    feedbackDiv.textContent = `Correto! ${feedbackText}`;
                    feedbackDiv.style.color = 'green'; feedbackDiv.style.borderColor = '#28a745'; feedbackDiv.style.backgroundColor = '#e6ffe6';
                } else {
                    feedbackDiv.innerHTML = `<p>Incorreto. ${feedbackText}</p>`;
                    feedbackDiv.style.color = 'red'; feedbackDiv.style.borderColor = '#dc3545'; feedbackDiv.style.backgroundColor = '#ffe6e6';
                }
            } else {
                feedbackDiv.textContent = 'Por favor, selecione uma opção antes de verificar.';
                feedbackDiv.style.color = 'orange'; feedbackDiv.style.borderColor = 'orange'; feedbackDiv.style.backgroundColor = '#fff8e1';
            }
        });
        cardDiv.appendChild(verificarBtn);
    }
    container.appendChild(cardDiv);
}

function verificarTodosOsItens(todasAsQuestoes) {
    const questoesInterativas = todasAsQuestoes.filter(item =>
        item.tipo === 'multipla_escolha' || item.tipo === 'verdadeiro_ou_falso'
    );
    let acertos = 0;
    let totalInterativos = questoesInterativas.length;
    let acertosPorCategoria = {}; // Para armazenar acertos por categoria
    let totalPorCategoria = {}; // Para armazenar total de questões por categoria

    if (totalInterativos === 0) {
        console.warn("Nenhuma questão interativa encontrada para verificação.");
        return;
    }

    questoesInterativas.forEach(itemData => {
        const perguntaHash = itemData.pergunta.replace(/\s+/g, '_').toLowerCase();
        const itemElement = document.querySelector(`.card-item[data-tipo-item="${itemData.tipo}"] input[name="questao_${perguntaHash}"]`)?.closest('.card-item');

        if (!itemElement) return;

        let feedbackDiv = itemElement.querySelector('.feedback-message');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'feedback-message';
            itemElement.appendChild(feedbackDiv);
        }

        // Inicializa contadores para a categoria se ainda não existirem
        if (!totalPorCategoria[itemData.categoria]) {
            totalPorCategoria[itemData.categoria] = 0;
            acertosPorCategoria[itemData.categoria] = 0;
        }
        totalPorCategoria[itemData.categoria]++;

        if (itemData.tipo === "multipla_escolha" || itemData.tipo === "verdadeiro_ou_falso") {
            const selectedOption = itemElement.querySelector(`input[name="questao_${perguntaHash}"]:checked`);
            if (selectedOption) {
                const isCorrect = selectedOption.getAttribute('data-correta') === 'true';
                const feedbackText = selectedOption.getAttribute('data-feedback');
                if (isCorrect) {
                    feedbackDiv.textContent = `Correto! ${feedbackText}`;
                    feedbackDiv.style.color = 'green'; feedbackDiv.style.borderColor = '#28a745'; feedbackDiv.style.backgroundColor = '#e6ffe6';
                    acertos++;
                    acertosPorCategoria[itemData.categoria]++;
                } else {
                    feedbackDiv.innerHTML = `<p>Incorreto. ${feedbackText}</p>`;
                    feedbackDiv.style.color = 'red'; feedbackDiv.style.borderColor = '#dc3545'; feedbackDiv.style.backgroundColor = '#ffe6e6';
                }
            } else {
                feedbackDiv.textContent = 'Você não selecionou uma opção para esta questão.';
                feedbackDiv.style.color = 'orange'; feedbackDiv.style.borderColor = 'orange'; feedbackDiv.style.backgroundColor = '#fff8e1';
            }
        }
    });

    const resultadoFinalDiv = document.getElementById('resultado-final');
    if (resultadoFinalDiv) {
        resultadoFinalDiv.style.display = 'block';

        const porcentagemAcertos = totalInterativos > 0 ? (acertos / totalInterativos) * 100 : 0;
        const textoPorcentagem = porcentagemAcertos.toFixed(1) + '%';

        let graphHtml = '';
        if (Object.keys(acertosPorCategoria).length > 0) {
            graphHtml = '<div class="bar-chart-container">';
            for (const categoria in acertosPorCategoria) {
                const acertosCat = acertosPorCategoria[categoria];
                const totalCat = totalPorCategoria[categoria];
                const porcentagemCat = totalCat > 0 ? (acertosCat / totalCat) * 100 : 0;
                const barColor = porcentagemCat >= 70 ? '#28a745' : (porcentagemCat >= 40 ? '#ffc107' : '#dc3545');

                graphHtml += `
                    <div class="bar-chart-item">
                        <div class="bar-label">${categoria}</div>
                        <div class="bar-progress-container">
                            <div class="bar-progress" style="width: ${porcentagemCat}%; background-color: ${barColor};"></div>
                            <span class="bar-percentage">${porcentagemCat.toFixed(1)}%</span>
                        </div>
                    </div>
                `;
            }
            graphHtml += '</div>';
        }

        resultadoFinalDiv.innerHTML = `
            <h2>Seu Resultado Final:</h2>
            <p>Você acertou ${acertos} de ${totalInterativos} questões interativas.</p>
            <p>Pontuação Geral: <strong>${textoPorcentagem}</strong></p>
            ${graphHtml}
            <p class="resultado-mensagem"></p>
        `;
        const mensagemElement = resultadoFinalDiv.querySelector('.resultado-mensagem');
        if (mensagemElement) {
            if (porcentagemAcertos === 100) { mensagemElement.textContent = "Parabéns! Você gabaritou!"; mensagemElement.style.color = 'green'; }
            else if (porcentagemAcertos >= 70) { mensagemElement.textContent = "Excelente! Continue assim!"; mensagemElement.style.color = 'darkgreen'; }
            else if (porcentagemAcertos >= 40) { mensagemElement.textContent = "Bom trabalho! Você está no caminho certo."; mensagemElement.style.color = 'orange'; }
            else { mensagemElement.textContent = "Continue praticando! Você vai melhorar."; mensagemElement.style.color = 'red'; }
        }
        resultadoFinalDiv.style.textAlign = 'center';
        resultadoFinalDiv.style.marginTop = '20px';
        resultadoFinalDiv.style.color = '#007bff';
    }
}

async function initActivity(numQuestoes = 25) { // Default para 25 se não especificado
    // Limpar conteúdo anterior
    const containerConteudo = document.querySelector('.container-conteudo');
    containerConteudo.innerHTML = '';
    document.getElementById('resultado-final').style.display = 'none';

    const { metadados, secaoIntroducao, questoes } = await carregarEConverterConteudoXML(numQuestoes);
    window.todasAsQuestoes = questoes; // Armazena para verificação

    const header = document.querySelector('.header');
    // Garante que o cabeçalho seja atualizado sem duplicar elementos existentes
    let tituloAtividade = header.querySelector('.titulo-atividade');
    let subtituloAtividade = header.querySelector('.subtitulo-atividade');
    let btnVoltar = header.querySelector('.btn-voltar');

    if (!btnVoltar) {
        btnVoltar = document.createElement('a');
        btnVoltar.href = '../../index.html'; // Ajuste o link conforme necessário
        btnVoltar.className = 'btn-voltar';
        btnVoltar.textContent = 'Voltar';
        header.prepend(btnVoltar); // Adiciona no início do header
    }

    if (!tituloAtividade) {
        tituloAtividade = document.createElement('h1');
        tituloAtividade.className = 'titulo-atividade';
        header.appendChild(tituloAtividade);
    }

    if (!subtituloAtividade) {
        subtituloAtividade = document.createElement('h2');
        subtituloAtividade.className = 'subtitulo-atividade';
        header.appendChild(subtituloAtividade);
    }
    
    // Atualiza metadados do cabeçalho
    if (tituloAtividade) {
        tituloAtividade.textContent = metadados.tituloRecurso;
    }
    if (subtituloAtividade) {
        subtituloAtividade.textContent = metadados.subtituloRecurso || "";
        subtituloAtividade.style.display = metadados.subtituloRecurso ? 'block' : 'none';
    }


    if (secaoIntroducao) {
        const introDiv = document.createElement('div');
        introDiv.className = 'secao-introducao';
        const introTitulo = document.createElement('h2');
        introTitulo.textContent = secaoIntroducao.tituloSecao;
        introDiv.appendChild(introTitulo);
        secaoIntroducao.paragrafos.forEach(pText => {
            const p = document.createElement('p');
            p.textContent = pText;
            introDiv.appendChild(p);
        });
        containerConteudo.appendChild(introDiv);
    }

    if (questoes.length > 0) {
        questoes.forEach(questaoItem => {
            renderizarCardItem(questaoItem, containerConteudo);
        });
    } else {
        const mensagemErro = document.createElement('p');
        mensagemErro.style.cssText = 'text-align: center; margin-top: 50px; font-size: 1.5em; color: #dc3545;';
        mensagemErro.textContent = 'Nenhum conteúdo foi carregado ou houve um erro. Verifique o arquivo XML.';
        containerConteudo.appendChild(mensagemErro);
    }

    // Garante que o footer e o botão de verificar todas as respostas sejam criados/atualizados
    let footer = document.querySelector('.footer');
    let verificarTodasBtn = footer.querySelector('.btn-verificar-todas');
    if (!verificarTodasBtn) {
        footer.innerHTML = ''; // Limpa o footer para adicionar o botão
        verificarTodasBtn = document.createElement('button');
        verificarTodasBtn.textContent = 'Verificar Todas as Respostas';
        verificarTodasBtn.className = 'btn-verificar-todas';
        footer.appendChild(verificarTodasBtn);

        verificarTodasBtn.addEventListener('click', () => {
            verificarTodosOsItens(window.todasAsQuestoes);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Carregamento inicial
    initActivity(25); // Carrega com 25 questões por padrão

    const numQuestoesInput = document.getElementById('numQuestoes');
    const carregarQuestoesBtn = document.getElementById('carregarQuestoesBtn');

    if (carregarQuestoesBtn) {
        carregarQuestoesBtn.addEventListener('click', () => {
            const num = parseInt(numQuestoesInput.value, 10);
            if (!isNaN(num) && num > 0) {
                initActivity(num);
            } else {
                alert('Por favor, insira um número válido de questões (maior que 0).');
            }
        });
    }
});