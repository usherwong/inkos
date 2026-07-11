#!/usr/bin/env bash
# MythFlow 品牌替换脚本(可重放):把用户可见的品牌词 "InkOS" 替换为 "MythFlow"。
#
# 只替换精确大小写的 "InkOS"(品牌展示词)。技术标识符不受影响,因为它们
# 大小写不同:inkos.json / .inkos / INKOS_* 环境变量 / @actalk/inkos-* 包名 /
# InkosLogo 等 TS 标识符(小写 o)。
#
# 不处理 *.md(README/CHANGELOG 保留上游署名,是 AGPL §5(a) 修改声明的一部分)。
#
# 用法:每次从 upstream rebase 后,在仓库根目录执行 ./scripts/rebrand-mythflow.sh
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=$(grep -rl "InkOS" packages/core/src packages/studio/src packages/studio/index.html packages/cli/src 2>/dev/null || true)
COUNT=0
for f in $FILES; do
  sed -i '' 's/InkOS/MythFlow/g' "$f"
  COUNT=$((COUNT+1))
done
echo "rebrand: 已替换 $COUNT 个文件"
REMAIN=$(grep -rn "InkOS" packages/core/src packages/studio/src packages/studio/index.html 2>/dev/null | wc -l | tr -d ' ')
echo "rebrand: src 中剩余 InkOS 出现次数: $REMAIN (应为 0)"
