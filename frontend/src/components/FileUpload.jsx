/**
 * components/FileUpload.jsx — Drag-and-drop file upload with structured extraction.
 *
 * Phase 2 changes:
 * - Calls onUploadComplete(fullResponse) instead of onExtracted(text)
 *   so the parent can access both extracted_text and extracted_fields.
 * - Shows upload progress state clearly.
 * - Handles empty file, wrong type, and server errors gracefully.
 */

import { useState, useRef, useCallback } from 'react'
import { uploadDocument } from '../api/client'

export default function FileUpload({ label, docType, onUploadComplete, currentText }) {
  const [isDragging, setIsDragging]   = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)  // { name, pages, chars, fieldCount }
  const [error, setError]             = useState(null)
  const inputRef                      = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return

    // Client-side size check (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10 MB.')
      return
    }

    // Client-side type check
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    if (!['.pdf', '.docx', '.doc'].includes(ext)) {
      setError(`Unsupported file type "${ext}". Please upload a PDF or DOCX.`)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const result = await uploadDocument(file, docType)
      setUploadedFile({
        name: result.filename,
        pages: result.page_count,
        chars: result.char_count,
        fieldCount: result.extracted_fields?.length || 0,
      })
      onUploadComplete(result)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try a different file.')
    } finally {
      setUploading(false)
    }
  }, [docType, onUploadComplete])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const icon = docType === 'resume' ? '📄' : '🎓'

  const handleRemove = () => {
    setUploadedFile(null)
    setError(null)
    onUploadComplete({ extracted_text: '', extracted_fields: [], extraction_warnings: [] })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="form-label">{icon} {label}</label>

      {uploadedFile ? (
        /* Success state */
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 text-xl flex-shrink-0">✅</span>
              <div>
                <p className="text-sm font-medium text-white truncate max-w-xs">{uploadedFile.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {uploadedFile.pages} page{uploadedFile.pages !== 1 ? 's' : ''} ·{' '}
                  {uploadedFile.chars.toLocaleString()} characters extracted
                  {uploadedFile.fieldCount > 0
                    ? <span className="ml-2 text-violet-400">· {uploadedFile.fieldCount} field{uploadedFile.fieldCount !== 1 ? 's' : ''} auto-detected</span>
                    : null
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0"
            >
              Remove
            </button>
          </div>
          {uploadedFile.fieldCount > 0 && (
            <p className="text-xs text-violet-300 mt-2 ml-9">
              ⚙️ Review auto-detected fields above before submitting.
            </p>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed transition-all duration-200
            ${uploading ? 'cursor-wait' : 'cursor-pointer'}
            ${isDragging
              ? 'border-violet-400 bg-violet-500/10'
              : 'border-white/10 bg-space-900 hover:border-violet-500/40 hover:bg-space-800'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
              <p className="text-sm text-violet-300">Uploading and extracting text…</p>
              <p className="text-xs text-slate-500">This may take a few seconds</p>
            </div>
          ) : (
            <>
              <div className="text-3xl opacity-30">{icon}</div>
              <div className="text-center">
                <p className="text-sm text-slate-400">
                  <span className="text-violet-400 font-medium">Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-slate-500 mt-0.5">PDF or DOCX · Max 10 MB</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <span className="text-rose-400 text-sm flex-shrink-0">⚠</span>
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}

      {/* Already has text but no file shown (e.g. restored from parent) */}
      {currentText && !uploadedFile && !uploading && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <span>✓</span> Document text loaded ({currentText.length.toLocaleString()} chars)
        </p>
      )}
    </div>
  )
}
