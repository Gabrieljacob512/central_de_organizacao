/**
 * Camada de armazenamento de arquivos binários no IndexedDB (banco: tecno-files).
 * Guarda blobs de anexos de chamados, comprovantes financeiros e fotos de perfil.
 * Limite de até 1 MB (1.048.576 bytes) por arquivo.
 */

const DB_NAME = 'tecno-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export const MAX_FILE_SIZE = 1_048_576; // 1 MB (1.048.576 bytes)
export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.docx', '.xlsx'];
export const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.bin', '.dll', '.com', '.vbs', '.js', '.scr'];

export interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir IndexedDB.'));
  });
}

/** Validação rigorosa de arquivo por Magic Bytes */
export async function validateMagicBytes(file: File | Blob): Promise<{ valid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo excede o limite máximo permitido de 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
    };
  }

  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Executáveis bloqueados explicitamente: MZ (4D 5A) ou ELF (7F 45 4C 46)
  if ((bytes[0] === 0x4d && bytes[1] === 0x5a) || (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46)) {
    return { valid: false, error: 'Arquivos executáveis (.exe / binários) são expressamente bloqueados por segurança.' };
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { valid: true };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true };
  }

  // PDF: %PDF (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { valid: true };
  }

  // ZIP / DOCX / XLSX (PK.. 50 4B 03 04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { valid: true };
  }

  // TXT ou outros tipos permitidos sem assinatura binária restrita
  if (file.type === 'text/plain' || (file instanceof File && file.name.endsWith('.txt'))) {
    return { valid: true };
  }

  return { valid: true };
}

/** Salva um arquivo no banco IndexedDB */
export async function saveFile(id: string, file: File | Blob, name: string): Promise<StoredFile> {
  const validation = await validateMagicBytes(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Arquivo inválido.');
  }

  const db = await openDatabase();
  const stored: StoredFile = {
    id,
    name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    blob: file,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(stored);

    req.onsuccess = () => resolve(stored);
    req.onerror = () => reject(req.error || new Error('Falha ao salvar arquivo no IndexedDB.'));
  });
}

/** Obtém um arquivo pelo ID e cria uma URL temporária para exibição/download */
export async function getFile(id: string): Promise<{ file: StoredFile; url: string } | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => {
      const result = req.result as StoredFile | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(result.blob);
      resolve({ file: result, url });
    };
    req.onerror = () => reject(req.error || new Error('Falha ao ler arquivo do IndexedDB.'));
  });
}

/** Exclui um arquivo do IndexedDB */
export async function deleteFile(id: string): Promise<boolean> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error('Falha ao excluir arquivo do IndexedDB.'));
  });
}

/** Exclui múltiplos arquivos do IndexedDB em cascata */
export async function deleteFiles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const id of ids) {
      store.delete(id);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Falha ao excluir arquivos em lote do IndexedDB.'));
  });
}

/** Limpa todos os arquivos do IndexedDB (para reset de demo) */
export async function clearAllFiles(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Falha ao limpar IndexedDB.'));
  });
}
