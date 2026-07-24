// ===== 设置页：GitHub Token / 用户名 / 仓库名，测试连接 =====

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { testConnection, type TestResult } from '@/lib/github'
import { useStore } from '@/store/useStore'

export default function SetupPage() {
  const { config, setConfig, clearConfig, loadData } = useStore()
  const navigate = useNavigate()

  const [token, setToken] = useState(config?.githubToken ?? '')
  const [owner, setOwner] = useState(config?.owner ?? '')
  const [repo, setRepo] = useState(config?.repo ?? '')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const filled = token.trim() && owner.trim() && repo.trim()

  const handleTest = async () => {
    if (!filled) return
    setTesting(true)
    setResult(null)
    const res = await testConnection({
      githubToken: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
    })
    setResult(res)
    setTesting(false)
    if (res.ok) {
      setConfig({ githubToken: token.trim(), owner: owner.trim(), repo: repo.trim() })
      void loadData()
      toast.success('配置已保存，正在进入应用…')
      setTimeout(() => navigate('/season'), 800)
    }
  }

  const handleClear = () => {
    if (window.confirm('确定清除本地配置？Token 将从浏览器中移除（数据仓库不受影响）。')) {
      clearConfig()
      setToken('')
      setOwner('')
      setRepo('')
      setResult(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {!config && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          首次使用请先完成下方配置，点击「测试连接并保存」成功后会自动进入应用。
          配置完成前，其他页面都会跳回本页。
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>连接你的数据仓库</CardTitle>
          <CardDescription>
            追番数据保存在你自己的 GitHub 私有仓库（data.json）中。配置仅存储在浏览器
            localStorage，不会上传到任何服务器。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">GitHub Token（fine-grained PAT）</Label>
            <Input
              id="token"
              type="password"
              placeholder="github_pat_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner">GitHub 用户名</Label>
            <Input
              id="owner"
              placeholder="your-username"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo">数据仓库名（建议设为 Private）</Label>
            <Input
              id="repo"
              placeholder="anime-tracker-data"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>

          {result && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                result.ok
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0" />
              )}
              {result.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={!filled || testing} className="flex-1">
              {testing && <Loader2 className="size-4 animate-spin" />}
              测试连接并保存
            </Button>
            {config && (
              <Button variant="outline" onClick={() => navigate('/season')}>
                进入应用
              </Button>
            )}
            {config && (
              <Button variant="ghost" className="text-destructive" onClick={handleClear}>
                清除配置
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">如何创建最小权限 Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</p>
          <p>2. Repository access 选择 Only select repositories，勾选你的数据仓库</p>
          <p>3. Permissions → Repository permissions → Contents 设为 Read and write（其余保持无权限）</p>
          <p>4. 生成后复制 Token 粘贴到上方（Token 只显示一次）</p>
          <p className="text-destructive/80">⚠️ 数据仓库请务必设为 Private；Token 泄露时可在同一页面随时吊销。</p>
        </CardContent>
      </Card>
    </div>
  )
}
