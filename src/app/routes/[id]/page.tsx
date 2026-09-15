'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  DownloadCloud,
  Eye,
  FileDown,
  Loader2,
  MapPin,
  Package,
  Users,
  ScrollText,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export default function ReportsPage() {
  const t = useTranslation()

  const REPORT_CARDS = [
    {
      id: 'mapping',
      title: t.mappingCoverage,
      description:
        'Detailed report of mapping rates by zone, machine, and product category.',
      buttonLabel: t.generateReport,
      icon: <MapPin className="h-5 w-5 text-blue-500" />,
    },
    {
      id: 'unmapped',
      title: t.unmappedProducts,
      description:
        'List of all products pending SIRET mapping with their location.',
      buttonLabel: t.generateReport,
      icon: <Package className="h-5 w-5 text-amber-500" />,
    },
    {
      id: 'producers',
      title: t.producerDistribution,
      description:
        'Product distribution by producer with volumes and geographic coverage.',
      buttonLabel: t.generateReport,
      icon: <Users className="h-5 w-5 text-emerald-500" />,
    },
    {
      id: 'logs',
      title: t.activityLogs,
      description:
        'Complete history of changes, creations, and deletions by user.',
      buttonLabel: t.downloadLogs,
      icon: <ScrollText className="h-5 w-5 text-slate-500" />,
    },
  ]

  const EXPORT_ACTIONS = [
    {
      id: 'xlsx',
      label: t.exportExcel,
      icon: <DownloadCloud className="h-4 w-4" />,
    },
    {
      id: 'csv',
      label: t.exportCsvFull,
      icon: <FileDown className="h-4 w-4" />,
    },
    {
      id: 'fipos',
      label: t.previewFipos,
      icon: <Eye className="h-4 w-4" />,
    },
    {
      id: 'dlogs',
      label: t.downloadLogs,
      icon: <DownloadCloud className="h-4 w-4" />,
    },
  ]

  const [loadingCards, setLoadingCards] = useState<Set<string>>(new Set())
  const [loadingExports, setLoadingExports] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function handleReportCard(id: string, isLogs: boolean) {
    if (loadingCards.has(id)) return
    setLoadingCards((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setLoadingCards((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToast(isLogs ? t.fileReady : t.reportGenerated)
    }, 1500)
  }

  function handleExport(id: string) {
    if (loadingExports.has(id)) return
    setLoadingExports((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setLoadingExports((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToast(t.fileReady)
    }, 1500)
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reports"
        description="Generate and export reports for your vending fleet"
      />

      {/* 2×2 Report Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORT_CARDS.map((card) => {
          const isLoading = loadingCards.has(card.id)
          return (
            <Card key={card.id} hover={false}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {card.icon}
                  <CardTitle>{card.title}</CardTitle>
                </div>
              </CardHeader>
              <p className="mb-4 text-sm text-[var(--text-muted)]">{card.description}</p>
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleReportCard(card.id, card.id === 'logs')}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="h-3.5 w-3.5" />
                      {card.buttonLabel}
                    </>
                  )}
                </Button>
                <span className="text-xs text-[var(--text-muted)]">
                  {t.lastExport}: 18/03/2026
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Export Panel */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>{t.exportData}</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          {EXPORT_ACTIONS.map((action) => {
            const isLoading = loadingExports.has(action.id)
            return (
              <Button
                key={action.id}
                variant="secondary"
                size="sm"
                disabled={isLoading}
                onClick={() => handleExport(action.id)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.icon
                )}
                {action.label}
              </Button>
            )
          })}
        </div>
      </Card>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
