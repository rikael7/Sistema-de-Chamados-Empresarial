const crypto = require('crypto');
const supabase = require('../config/supabase');

const BUCKET = 'chamados-anexos';
const SIGNED_URL_EXPIRA_EM = 60 * 60; // 1 hora

// Sobe um arquivo pro bucket e retorna { nomeArquivo, signedUrl }
async function subirAnexo(chamadoId, arquivo) {
  const extensao = arquivo.originalname.split('.').pop();
  const nomeArquivo = `${chamadoId}/${crypto.randomUUID()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(nomeArquivo, arquivo.buffer, {
      contentType: arquivo.mimetype,
      upsert: false,
    });

  if (erroUpload) {
    throw new Error(`Falha ao subir anexo: ${erroUpload.message}`);
  }

  const { data: signedData, error: erroSigned } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(nomeArquivo, SIGNED_URL_EXPIRA_EM);

  if (erroSigned) {
    // Upload já foi feito, mas falhou ao assinar — limpa antes de propagar o erro
    await supabase.storage.from(BUCKET).remove([nomeArquivo]);
    throw new Error(`Falha ao gerar URL do anexo: ${erroSigned.message}`);
  }

  return { nomeArquivo, signedUrl: signedData.signedUrl };
}

async function removerAnexos(nomesArquivos) {
  if (nomesArquivos.length === 0) return;
  await supabase.storage.from(BUCKET).remove(nomesArquivos);
}

async function gerarUrlAssinada(nomeArquivo) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(nomeArquivo, SIGNED_URL_EXPIRA_EM);
  if (error) throw new Error(`Falha ao gerar URL do anexo: ${error.message}`);
  return data.signedUrl;
}

module.exports = { subirAnexo, removerAnexos, gerarUrlAssinada, BUCKET };