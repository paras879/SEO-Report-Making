import { useRef, useState } from 'react';

// image ko resize+compress karke dataURI banata hai (size chhota rahe)
function compressImage(file, maxWidth = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_IMAGES = 8;

export default function NotesEditor({ value, onChange }) {
  const { text, images } = value;
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const addFiles = async (files) => {
    setErr('');
    const imgs = [...images];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (imgs.length >= MAX_IMAGES) { setErr(`Max ${MAX_IMAGES} images allowed per note`); break; }
      try {
        const dataUri = await compressImage(f);
        imgs.push(dataUri);
      } catch (e) { setErr('Could not process pasted image'); }
    }
    onChange({ text, images: imgs });
  };

  const onPaste = (e) => {
    const items = e.clipboardData?.items || [];
    const imageFiles = [];
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  };

  const removeImage = (idx) => onChange({ text, images: images.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 transition-all">
        {/* Editor Toolbar Header */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-400">
            <span>✍️</span>
            <span>Write Note</span>
          </div>
          <span className="text-[11px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 shadow-sm">
            💡 Ctrl+V to paste screenshots
          </span>
        </div>

        {/* Text Input Area */}
        <textarea
          className="w-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none resize-y min-h-[160px] leading-relaxed"
          placeholder="Document issues, ongoing research, link building progress, or questions... You can paste screenshots directly with Ctrl+V!"
          value={text}
          onChange={(e) => onChange({ text: e.target.value, images })}
          onPaste={onPaste}
        />

        {/* Attached Images Grid */}
        {images.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Attached Images ({images.length}/{MAX_IMAGES})
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {images.map((src, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                  <img src={src} alt={`attachment-${i}`} className="h-28 w-28 object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold shadow-lg transition-transform active:scale-95"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Upload & Action Strip */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-white border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg shadow-sm transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <span>🖼️</span>
            <span>Upload Image</span>
          </button>

          <span className="text-[11px] text-slate-400">
            {images.length}/{MAX_IMAGES} images attached
          </span>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }}
          />
        </div>
      </div>

      {err && (
        <p className="text-xs font-medium text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>{err}</span>
        </p>
      )}
    </div>
  );
}
