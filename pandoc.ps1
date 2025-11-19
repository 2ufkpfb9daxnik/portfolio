# ...existing code...
param(
    [Parameter(Mandatory=$true)]
    [string]$PagePath
)

# --- ユーティリティ ---
function Get-SoftColorHex {
    param()
    $h = Get-Random -Minimum 0 -Maximum 360
    $s = Get-Random -Minimum 14 -Maximum 30
    $l = Get-Random -Minimum 80 -Maximum 92
    return (HslToHex $h $s $l)
}

function HslToHex {
    param(
        [double]$h,
        [double]$s,
        [double]$l
    )
    $s = [double]$s / 100.0
    $l = [double]$l / 100.0

    if ($s -eq 0) {
        $r = $g = $b = [math]::Round($l * 255)
    } else {
        if ($l -lt 0.5) { $q = $l * (1 + $s) } else { $q = $l + $s - $l * $s }
        $p = 2 * $l - $q

        function HueToRgb([double]$p,[double]$q,[double]$t) {
            if ($t -lt 0) { $t += 1 }
            if ($t -gt 1) { $t -= 1 }
            if ($t -lt (1/6)) { return $p + ($q - $p) * 6 * $t }
            if ($t -lt (1/2)) { return $q }
            if ($t -lt (2/3)) { return $p + ($q - $p) * (2/3 - $t) * 6 }
            return $p
        }

        $r = HueToRgb $p $q ($h / 360.0 + 1.0/3.0)
        $g = HueToRgb $p $q ($h / 360.0)
        $b = HueToRgb $p $q ($h / 360.0 - 1.0/3.0)

        $r = [math]::Round($r * 255)
        $g = [math]::Round($g * 255)
        $b = [math]::Round($b * 255)
    }

    $r = [int][math]::Max(0, [math]::Min(255, [int]$r))
    $g = [int][math]::Max(0, [math]::Min(255, [int]$g))
    $b = [int][math]::Max(0, [math]::Min(255, [int]$b))

    return ("#{0:X2}{1:X2}{2:X2}" -f $r, $g, $b)
}

# --- 正規化とパス ---
$PagePath = $PagePath.TrimEnd('\', '/')
$MarkdownPath = Join-Path $PagePath 'index.md'
$HtmlPath = Join-Path $PagePath 'index.html'
$CssPath = Join-Path $PagePath 'stylesheet.css'

if (-not (Test-Path $MarkdownPath)) {
    Write-Error "Markdownファイルが見つかりません: $MarkdownPath"
    exit 1
}

$TemplateDir = "pages/template"
$TemplateHtml = Join-Path $TemplateDir 'index.html'
$TemplateCss = Join-Path $TemplateDir 'stylesheet.css'
$TemplateScript = Join-Path $TemplateDir 'script.js'

if (-not (Test-Path $TemplateHtml) -or -not (Test-Path $TemplateCss)) {
    Write-Error "テンプレートファイルが見つかりません: $TemplateHtml / $TemplateCss"
    exit 1
}

# 作成日（ファイルシステム）と最終更新（現在時刻に固定）
$FileInfo = Get-Item $MarkdownPath
$CreatedDate = $FileInfo.CreationTime.ToString("yyyy-MM-dd HH:mm")
# ユーザ要望に合わせ、最終更新を「今」にする（必要なら git を優先するよう改変可能）
$ModifiedDate = (Get-Date).ToString("yyyy-MM-dd HH:mm")

# Markdown 読み込みとフロントマター処理
$Content = Get-Content $MarkdownPath -Raw -Encoding UTF8
$Lines = $Content -split "`n"

$InFrontMatter = $false
$FrontMatterEnd = -1
$Title = ""

for ($i = 0; $i -lt $Lines.Length; $i++) {
    if ($Lines[$i].Trim() -eq "---") {
        if (-not $InFrontMatter) { $InFrontMatter = $true }
        else { $FrontMatterEnd = $i; break }
    } elseif ($InFrontMatter -and $Lines[$i] -match 'title:\s*"(.+)"') {
        $Title = $Matches[1]
    } elseif ($InFrontMatter -and $Lines[$i] -match "title:\s*'(.+)'") {
        $Title = $Matches[1]
    } elseif ($InFrontMatter -and $Lines[$i] -match 'title:\s*(.+)') {
        $Title = $Matches[1].Trim()
    }
}

if ([string]::IsNullOrEmpty($Title)) {
    $Title = Split-Path $PagePath -Leaf
}

if ($FrontMatterEnd -ge 0) {
    $BodyLines = $Lines[($FrontMatterEnd + 1)..($Lines.Length - 1)]
    $BodyMarkdown = $BodyLines -join "`n"
} else {
    $BodyMarkdown = $Content
}

$DateInfo = "作成: $CreatedDate`n`n"
$UpdateInfo = "`n`n最終更新: $ModifiedDate"
$BodyMarkdown = $DateInfo + $BodyMarkdown.Trim() + $UpdateInfo

$TempMarkdown = [System.IO.Path]::GetTempFileName() + ".md"
$BodyMarkdown | Out-File -FilePath $TempMarkdown -Encoding UTF8

try {
    $PandocArgs = @(
        $TempMarkdown,
        "-o", $HtmlPath,
        "--template=$TemplateHtml",
        "--toc",
        "--toc-depth=3",
        "-V", "title=$Title",
        "--standalone",
        "--highlight-style=tango",
        "-f", "markdown+pipe_tables+raw_attribute+fenced_code_attributes+footnotes"
    )

    & pandoc @PandocArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pandocの実行に失敗しました"
        exit 1
    }
} finally {
    if (Test-Path $TempMarkdown) { Remove-Item $TempMarkdown }
}

# --- CSS を生成・調整 ---
$CssContent = Get-Content $TemplateCss -Raw -Encoding UTF8

$SoftColor = Get-SoftColorHex
if ([string]::IsNullOrEmpty($SoftColor)) { $SoftColor = "#F6F8F6" }
# テンプレートの既存色（例 #EEFFEE）を置換
$CssContent = $CssContent -replace '#EEFFEE', $SoftColor

$ExtraCss = @"
table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
}
table th, table td {
  border: 1px solid rgba(0,0,0,0.08);
  padding: 0.5em 0.6em;
  text-align: left;
  background: rgba(255,255,255,0.02);
}
table th { font-weight: bold; }
pre, code {
  font-family: Consolas, 'Courier New', monospace;
  background: rgba(0,0,0,0.03);
  color: inherit;
}
pre {
  padding: 0.8em;
  overflow: auto;
  border-radius: 6px;
  margin: 0.8em 0;
  border: 1px solid rgba(0,0,0,0.06);
}
code {
  padding: 0.12em 0.25em;
  border-radius: 3px;
  background: rgba(0,0,0,0.02);
  font-size: 0.95em;
}
"@

$CssContent += "`n" + $ExtraCss
$CssContent | Out-File -FilePath $CssPath -Encoding UTF8

# --- HTML の相対パス修正 ---
if (-not (Test-Path $HtmlPath)) {
    Write-Warning "出力HTMLが見つかりません: $HtmlPath"
    exit 1
}
$HtmlContent = Get-Content $HtmlPath -Raw -Encoding UTF8

$firstSegment = ($PagePath -split '[\\\/]')[0]
if ($firstSegment -eq 'pages') {
    $HomePath = "../../index.html"
} else {
    $HomePath = "../index.html"
}

# 文字列置換（href 属性内の任意階層 ../ を正規化して置換）
# 例: href="index.html", href="../index.html", href="../../index.html", href="../../../index.html" などを
# 計算済みの $HomePath に統一する
$HtmlContent = [regex]::Replace($HtmlContent, 'href\s*=\s*"(?:\.\.\/)*index\.html"', "href=`"$HomePath`"", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
# safety: href="index.html"（../ が無いケース）も上の正規表現でカバーするが、念のため残す
$HtmlContent = [regex]::Replace($HtmlContent, 'href\s*=\s*"\s*index\.html\s*"', "href=`"$HomePath`"", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)


# script.js をテンプレートから出力先にコピー（存在すれば）
if (Test-Path $TemplateScript) {
    try {
        Copy-Item -Path $TemplateScript -Destination (Join-Path $PagePath 'script.js') -Force
        Write-Host "script.js を $PagePath にコピーしました"
    } catch {
        Write-Warning "script.js のコピーに失敗しました: $_"
    }
}

# 生成ページにローカル script.js を挿入（存在しない場合はルート参照にフォールバック）
$localScript = "script.js"
if (-not (Test-Path (Join-Path $PagePath $localScript))) {
    # ルートの script.js を使う（存在する場合）
    $localScript = ($firstSegment -eq 'pages') ? "../../script.js" : "../script.js"
}

if ($HtmlContent -notmatch '<script[^>]*src=["''].*script\.js') {
    $insertScriptTag = "<script src=`"$localScript`"></script>`n"
    $HtmlContent = [regex]::Replace($HtmlContent, '(</body>)', $insertScriptTag + '$1', [System.Text.RegularExpressions.RegexOptions]::Singleline)
}

# 二重スラッシュの正規化は script タグ内部を除いて行う
$scriptRegex = [regex] '(?is)<script\b[^>]*>.*?</script>'
$lastIndex = 0
$result = ''
$matches = $scriptRegex.Matches($HtmlContent)
foreach ($m in $matches) {
    $segment = $HtmlContent.Substring($lastIndex, $m.Index - $lastIndex)
    # non-script 部分のみ正規化（プロトコルは残す）
    $segment = [regex]::Replace($segment, '(?<!:)/{2,}', '/', [System.Text.RegularExpressions.RegexOptions]::None)
    $result += $segment + $m.Value
    $lastIndex = $m.Index + $m.Length
}
if ($lastIndex -lt $HtmlContent.Length) {
    $segment = $HtmlContent.Substring($lastIndex)
    $segment = [regex]::Replace($segment, '(?<!:)/{2,}', '/', [System.Text.RegularExpressions.RegexOptions]::None)
    $result += $segment
}
$HtmlContent = $result

# 最終的に書き出し
$HtmlContent | Out-File -FilePath $HtmlPath -Encoding UTF8

# 出力ファイルのタイムスタンプを「今」に更新（表示とファイル両方を揃える）
try {
    (Get-Item $HtmlPath).LastWriteTime = Get-Date
    (Get-Item $CssPath).LastWriteTime = Get-Date
    if (Test-Path (Join-Path $PagePath 'script.js')) { (Get-Item (Join-Path $PagePath 'script.js')).LastWriteTime = Get-Date }
} catch {
    Write-Warning "ファイルタイムスタンプの更新に失敗しました: $_"
}

Write-Host "生成された背景色: $SoftColor"

# --- ルート index.html のテンプレート内に記事リンクを一件だけ追加 ---
$RootIndexPath = "index.html"
if (Test-Path $RootIndexPath) {
    $RootContent = Get-Content $RootIndexPath -Raw -Encoding UTF8

    $RelativePath = $PagePath.Replace('\', '/')
    if (-not $RelativePath.StartsWith("pages/")) {
        $RelativePath = "pages/$RelativePath"
    }

    $NewLi = "      <li><a href=""$RelativePath/"">$Title</a></li>"

    if ($RootContent -notmatch [regex]::Escape("href=""$RelativePath/""")) {
        $pattern = '(?s)(<template\s+[^>]*id\s*=\s*["'']article-links-template["''][^>]*>.*?<ul[^>]*>)(.*?)(</ul>)(.*?</template>)'
        $re = [regex]::new($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        $m = $re.Match($RootContent)
        if ($m.Success) {
            $before = $m.Groups[1].Value
            $inner = $m.Groups[2].Value
            $afterUl = $m.Groups[3].Value
            $rest = $m.Groups[4].Value

            $newInner = $inner.TrimEnd() + "`n" + $NewLi + "`n"
            $replacement = $before + $newInner + $afterUl + $rest

            $newRoot = $RootContent.Substring(0, $m.Index) + $replacement + $RootContent.Substring($m.Index + $m.Length)
            $newRoot | Out-File -FilePath $RootIndexPath -Encoding UTF8
            Write-Host "ルートindex.htmlのテンプレートに新しいリンクを追加しました: $Title"
        } else {
            Write-Warning "ルートindex.html内に <template id='article-links-template'> が見つかりませんでした。手動でリンクを追加してください。"
        }
    } else {
        Write-Host "ルートindex.htmlには既に同一リンクが存在します: $Title"
    }
} else {
    Write-Warning "ルートの index.html が見つかりません。リンク追加をスキップしました。"
}

Write-Host "HTMLとCSSファイルが正常に生成されました"
Write-Host "HTML: $HtmlPath"
Write-Host "CSS: $CssPath"
# ...existing code...