const express = require('express');
const cors = require('cors');
const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime'); // Novo pacote e comando

const app = express();
app.use(cors());
app.use(express.json());

const client = new BedrockAgentRuntimeClient({
    region: 'us-east-1', // Atualize para sua região
    credentials: {
        accessKeyId: 'AKIAWCMNVAK5EX3UZNK7', // Substitua pela sua Access Key
        secretAccessKey: '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' // Substitua pela sua Secret Key
    }
});

// Função para limpar Markdown, escapes e caracteres indesejados
function cleanText(text) {
    if (!text || typeof text !== 'string') return 'No response received.';
    return text
        .replace(/\\n/g, ' ') // Remove quebras de linha
        .replace(/\\"/g, '"') // Remove barras antes de aspas
        .replace(/\\+/g, '') // Remove barras invertidas extras
        .replace(/[*_]{1,2}/g, '') // Remove asteriscos e sublinhados (Markdown)
        .replace(/#+/g, '') // Remove cabeçalhos Markdown
        .replace(/\[.*?\]\(.*?\)/g, '') // Remove links Markdown
        .replace(/```[\s\S]*?```/g, '') // Remove blocos de código Markdown
        .replace(/Kadjar/gi, 'Kardian') // Corrige "Kadjar" para "Kardian" (fallback)
        .replace(/kard ian/gi, 'Kardian') // Corrige "Kard ian" para "Kardian"
        .trim();
}

app.post('/bedrock', async (req, res) => {
    const { prompt } = req.body;
    console.log('Received prompt:', prompt);

    try {
        const command = new RetrieveAndGenerateCommand({
            input: {
                text: `Você é um agente de suporte para uma empresa automotiva, 
                seu trabalho é responder perguntas dos usuários sobre quatro modelos de carros baseados no manual do proprietário deles, 
                Renault Kardian, Renault Sandero RS, Nissan Sentra, Nissan Frontier. Entregue os dados tratados, de forma coesa. Você deve fornecer as respostas em português do Brasil. 
                Ao gerar a resposta a deixe de forma limpa, remova qualquer caractere diferente, 
                como contra barras, asteriscos, colchetes, chaves e parenteses. ${prompt}` // Adiciona instrução
            },
            retrieveAndGenerateConfiguration: {
                type: 'KNOWLEDGE_BASE', // Ativa o RAG com Knowledge Base
                knowledgeBaseConfiguration: {
                    knowledgeBaseId: 'R4VF7VDZJH', // Substitua pelo ID da sua Knowledge Base (pegue no console AWS Bedrock)
                    modelArn: 'arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0', // ARN do modelo (confirme no console)
                    retrievalConfiguration: {
                        vectorSearchConfiguration: {
                            numberOfResults: 5 // Número de resultados a recuperar da KB (ajuste conforme necessário)
                        }
                    }
                }
            },
            // Opcional: Para sessões multi-turn, adicione sessionId (ex.: gere um UUID pra cada conversa)
            // sessionId: 'sua-sessao-id-unica' 
        });

        const response = await client.send(command);
        console.log('Bedrock response (raw):', response);

        // Extrair o texto da resposta (formato padrão para RetrieveAndGenerate)
        let text = response.output.text || 'No response received.';

        // Limpar o texto
        text = cleanText(text);
        console.log('Cleaned response:', text);

        res.json({ response: text });
    } catch (error) {
        console.error('Error invoking Bedrock:', error);
        res.status(500).json({ error: `Failed to invoke Bedrock: ${error.message}` });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));