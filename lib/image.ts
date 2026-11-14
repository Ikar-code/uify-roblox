/**
 * Lit une image locale, la réduit (max 800 px) et la renvoie en data URL.
 * Réduire la taille évite de saturer le stockage du navigateur.
 */
export function fileToImage(file: File, max = 800): Promise<{ url: string; aspect: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponible"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let url = canvas.toDataURL("image/webp", 0.85);
        if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/png");
        resolve({ url, aspect: img.width / img.height });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
