param(
    [Parameter(Mandatory=$true)]
    [string]$PagePath
)

# パスの正規化
$PagePath = $PagePath.TrimEnd('\', '/')
$MarkdownPath = "$PagePath\index.md"
$HtmlPath = "$PagePath\index.html"
$CssPath = "$PagePath\stylesheet.css"

# ファイルの存在確認
if (-not (Test-Path $MarkdownPath)) {
    Write-Error "Markdownファイルが見つかりません: $MarkdownPath"
    exit 1
}

# テンプレートファイルのパス
$TemplateDir = "template"
$TemplateHtml = "$TemplateDir\index.html"
$TemplateCss = "$TemplateDir\stylesheet.css"

if (-not (Test-Path $TemplateHtml) -or -not (Test-Path $TemplateCss)) {
    Write-Error "テンプレートファイルが見つかりません"
    exit 1
}

# ファイルの作成日と更新日を取得
$FileInfo = Get-Item $MarkdownPath
$CreatedDate = $FileInfo.CreationTime.ToString("yyyy-MM-dd HH:mm")
$ModifiedDate = $FileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm")

# Markdownファイルを読み込んでメタデータを抽出
$Content = Get-Content $MarkdownPath -Raw -Encoding UTF8
$Lines = $Content -split "`n"

# YAMLフロントマターの処理
$InFrontMatter = $false
$FrontMatterEnd = -1
$Title = ""

for ($i = 0; $i -lt $Lines.Length; $i++) {
    if ($Lines[$i].Trim() -eq "---") {
        if (-not $InFrontMatter) {
            $InFrontMatter = $true
        } else {
            $FrontMatterEnd = $i
            break
        }
    } elseif ($InFrontMatter -and $Lines[$i] -match 'title:\s*"(.+)"') {
        $Title = $Matches[1]
    } elseif ($InFrontMatter -and $Lines[$i] -match "title:\s*'(.+)'") {
        $Title = $Matches[1]
    } elseif ($InFrontMatter -and $Lines[$i] -match 'title:\s*(.+)') {
        $Title = $Matches[1].Trim()
    }
}

# タイトルが見つからない場合のデフォルト
if ([string]::IsNullOrEmpty($Title)) {
    $Title = Split-Path $PagePath -Leaf
}

# 本文部分のMarkdownを抽出
$BodyMarkdown = ""
if ($FrontMatterEnd -ge 0) {
    $BodyLines = $Lines[($FrontMatterEnd + 1)..($Lines.Length - 1)]
    $BodyMarkdown = $BodyLines -join "`n"
} else {
    $BodyMarkdown = $Content
}

# 作成日と更新日を本文の最初と最後に追加
$DateInfo = "作成: $CreatedDate`n`n"
$UpdateInfo = "`n`n最終更新: $ModifiedDate"
$BodyMarkdown = $DateInfo + $BodyMarkdown.Trim() + $UpdateInfo

# 一時ファイルを作成してMarkdownを保存
$TempMarkdown = [System.IO.Path]::GetTempFileName() + ".md"
$BodyMarkdown | Out-File -FilePath $TempMarkdown -Encoding UTF8

try {
    # PandocでHTMLに変換（目次付き）
    $PandocArgs = @(
        $TempMarkdown,
        "-o", $HtmlPath,
        "--template=$TemplateHtml",
        "--toc",
        "--toc-depth=3",
        "-V", "title=$Title",
        "--standalone"
    )
    
    & pandoc @PandocArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pandocの実行に失敗しました"
        exit 1
    }
    
} finally {
    # 一時ファイルを削除
    if (Test-Path $TempMarkdown) {
        Remove-Item $TempMarkdown
    }
}

# ランダムな背景色を生成（ff と ee の組み合わせ）
$Colors = @("ff", "ee")
$RandomColor = "#"
for ($i = 0; $i -lt 3; $i++) {
    $RandomColor += $Colors | Get-Random
}

# CSSファイルを生成
$CssContent = Get-Content $TemplateCss -Raw -Encoding UTF8
# ライトモードの背景色をランダムに変更
$CssContent = $CssContent -replace '#EEFFEE', $RandomColor
$CssContent | Out-File -FilePath $CssPath -Encoding UTF8

# HTMLファイルの相対パスを修正
$HtmlContent = Get-Content $HtmlPath -Raw -Encoding UTF8

# pages/フォルダ名の場合の相対パス計算
$RelativeDepth = ($PagePath -split '[\\\/]').Count
if ($PagePath.StartsWith("pages")) {
    $HomePath = "../../index.html"  # pages/フォルダ名/ から ルートへ
} else {
    $HomePath = "../index.html"     # その他の場合
}

# テンプレート内の ../index.html を正しいパスに置換
$HtmlContent = $HtmlContent -replace '\.\./index\.html', $HomePath

# home-top と home-bottom の index.html も修正
$HtmlContent = $HtmlContent -replace 'href="index\.html"', "href=`"$HomePath`""

$HtmlContent | Out-File -FilePath $HtmlPath -Encoding UTF8

Write-Host "生成された背景色: $RandomColor"

# サイトルートのindex.htmlに新しいリンクを追加
$RootIndexPath = "index.html"
if (Test-Path $RootIndexPath) {
    $RootContent = Get-Content $RootIndexPath -Raw -Encoding UTF8
    
    # 相対パスを計算（pages/フォルダ名/の形式）
    $RelativePath = $PagePath.Replace('\', '/')
    if (-not $RelativePath.StartsWith("pages/")) {
        $RelativePath = "pages/$RelativePath"
    }
    
    # 既存のリンクが存在するかチェック
    $LinkPattern = "<li><a href=`"$RelativePath/`">"
    
    if ($RootContent -notmatch [regex]::Escape($LinkPattern)) {
        # サイドバーの目次に新しいリンクを追加
        $NewLink = "            <li><a href=`"$RelativePath/`">$Title</a></li>"
        $RootContent = $RootContent -replace '(\s*)</ul>', "`$1$NewLink`n`$1</ul>"
        
        # スマホ用のリンクリストにも追加
        $MobileNewLink = "        <li><a href=`"$RelativePath/`">$Title</a></li>"
        $RootContent = $RootContent -replace '(\s*)</ul>\s*</div>\s*</div>', "`$1$MobileNewLink`n`$1</ul>`n      </div>`n    </div>"
        
        # ファイルに書き戻し
        $RootContent | Out-File -FilePath $RootIndexPath -Encoding UTF8
        Write-Host "ルートindex.htmlに新しいリンクを追加しました: $Title"
    } else {
        Write-Host "リンクは既に存在します: $Title"
    }
} else {
    Write-Warning "ルートのindex.htmlが見つかりません"
}

Write-Host "HTMLとCSSファイルが正常に生成されました"
Write-Host "HTML: $HtmlPath"
Write-Host "CSS: $CssPath"