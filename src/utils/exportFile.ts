import { Capacitor } from '@capacitor/core';
export async function exportFile(blob: Blob, filename: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not prepare this file.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = await Filesystem.writeFile({ path: `exports/${safeName}`, data, directory: Directory.Cache, recursive: true });
  await Share.share({ title: safeName, files: [file.uri], dialogTitle: 'Save or share file' });
}
