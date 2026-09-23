import React, { useState } from 'react'
import {
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react'
import {
  type UpdateInfo,
  CURRENT_VERSION,
  checkForAppUpdates,
  installTauriUpdate,
} from '../../utils/updater'

interface UpdateDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    setLoading(true)
    setError(null)
    setInstallSuccess(false)
    try {
      const res = await checkForAppUpdates()
      setUpdateInfo(res)
      if (res.error) {
        setError(res.error)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (downloading) return
    setUpdateInfo(null)
    setError(null)
    setDownloading(false)
    setProgress(null)
    setInstallSuccess(false)
    onClose()
  }

  React.useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoading(true)
    setError(null)
    checkForAppUpdates()
      .then((res) => {
        if (!active) return
        setUpdateInfo(res)
        if (res.error) setError(res.error)
      })
      .catch((err) => {
        if (!active) return
        setError((err as Error).message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isOpen])

  const handleInstall = async () => {
    setDownloading(true)
    setError(null)
    try {
      await installTauriUpdate((downloaded, total) => {
        if (total && total > 0) {
          setProgress(Math.round((downloaded / total) * 100))
        }
      })
      setInstallSuccess(true)
    } catch (err) {
      setError((err as Error).message)
      setDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-2xl animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Cập nhật phần mềm</h3>
              <p className="text-[11px] text-slate-400">Phiên bản hiện tại: v{CURRENT_VERSION}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={downloading}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer disabled:opacity-30"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-cyan-400" />
              <span className="text-xs">Đang kiểm tra bản cập nhật mới nhất...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-950/40 border border-red-900/50 p-3 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Không thể kiểm tra cập nhật</p>
                <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          ) : updateInfo?.available ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-cyan-950/30 border border-cyan-800/50 p-3">
                <div>
                  <span className="font-semibold text-cyan-300 text-sm">
                    Đã có phiên bản mới: v{updateInfo.latestVersion}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {updateInfo.releaseDate
                      ? `Phát hành ngày ${new Date(updateInfo.releaseDate).toLocaleDateString()}`
                      : 'Bản cập nhật được khuyến nghị'}
                  </p>
                </div>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                  MỚI
                </span>
              </div>

              {updateInfo.notes && (
                <div className="max-h-40 overflow-y-auto rounded-lg bg-[#090d16] p-3 text-[11px] text-slate-300 border border-slate-800/80 font-mono whitespace-pre-wrap">
                  {updateInfo.notes}
                </div>
              )}

              {downloading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw size={11} className="animate-spin text-cyan-400" />
                      Đang tải và chuẩn bị cài đặt...
                    </span>
                    <span className="font-mono text-cyan-400">{progress !== null ? `${progress}%` : 'Đang xử lý'}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-200"
                      style={{ width: `${progress ?? 10}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Ứng dụng sẽ tự động khởi động lại sau khi nạp xong.</p>
                </div>
              )}

              {installSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 p-2.5 text-xs text-emerald-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Cập nhật hoàn tất! Đang khởi động lại ứng dụng...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="font-semibold text-sm text-slate-200">MarkFlow đang ở phiên bản mới nhất</p>
              <p className="text-xs text-slate-400">
                Bạn đang sử dụng phiên bản v{CURRENT_VERSION}.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={handleCheck}
            disabled={loading || downloading}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Kiểm tra lại</span>
          </button>

          <div className="flex items-center gap-2">
            {updateInfo?.available && updateInfo.hasNativeUpdater && !installSuccess && (
              <button
                onClick={handleInstall}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 font-medium text-white hover:bg-cyan-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download size={13} />
                <span>{downloading ? 'Đang cập nhật...' : 'Cập nhật & Khởi động lại'}</span>
              </button>
            )}

            {updateInfo?.available && (!updateInfo.hasNativeUpdater || updateInfo.downloadUrl) && !downloading && (
              <a
                href={updateInfo.downloadUrl || 'https://github.com/AMSComm/MarkFlow/releases'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 font-medium text-white hover:bg-cyan-500 transition-colors cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Xem bản phát hành trên GitHub</span>
              </a>
            )}

            <button
              onClick={handleClose}
              disabled={downloading}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
