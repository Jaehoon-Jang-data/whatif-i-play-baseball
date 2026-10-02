"""Extract only the visible yearly team tables from KBO's official history page."""

import html
import json
import re
import urllib.request
from datetime import date
from pathlib import Path


URL = "https://www.koreabaseball.com/Record/History/Team/Record.aspx"
ROOT = Path(__file__).resolve().parents[1]
TABLE = re.compile(r'<table class="tData"[^>]*>.*?</table>', re.S)
ROW = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
CELL = re.compile(r"<(?:th|td)\b[^>]*>(.*?)</(?:th|td)>", re.S)
TAG = re.compile(r"<[^>]*>")


def clean(value):
    return " ".join(html.unescape(TAG.sub("", value)).split())


years = {}
for decade in (1980, 1990, 2000, 2010, 2020):
    url = f"{URL}?startYear={decade}&halfSc=T"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    page = urllib.request.urlopen(request, timeout=20).read().decode("utf-8")
    for table in TABLE.findall(page):
        rows = [[clean(cell) for cell in CELL.findall(row)] for row in ROW.findall(table)]
        if not rows or not re.fullmatch(r"20\d\d|19\d\d", rows[0][0]):
            continue
        year = int(rows[0][0])
        if rows[0][1:] != ["경기", "승", "패", "무", "타율", "평균자책점", "승률"]:
            raise ValueError(f"unexpected KBO columns for {year}: {rows[0]}")
        teams = []
        for row in rows[1:]:
            if len(row) != 8 or row[0] == "합계":
                continue
            name, games, wins, losses, ties, avg, era, pct = row
            teams.append({"name": name, "g": int(games), "w": int(wins),
                          "l": int(losses), "tie": int(ties), "avg": float(avg),
                          "era": float(era), "pct": float(pct)})
        if not teams:
            raise ValueError(f"no teams found for {year}")
        if year in years:
            raise ValueError(f"duplicate year {year}")
        years[year] = teams

if sorted(years) != list(range(1982, max(years) + 1)):
    raise ValueError(f"missing years: {sorted(years)}")
for year, teams in years.items():
    for team in teams:
        if team["g"] != team["w"] + team["l"] + team["tie"]:
            raise ValueError(f"games do not sum: {year} {team['name']}")
        # Older KBO tables can use a different tie convention. Preserve the
        # published winning percentage instead of rewriting historical data.

output = {
    "source": URL,
    "retrieved": date.today().isoformat(),
    "eraTabs": ["1980년대", "1990년대", "2000년대", "2010년대", "2020년대"],
    "fields": ["g", "w", "l", "tie", "avg", "era", "pct"],
    "years": {str(year): years[year] for year in sorted(years)},
}
target = ROOT / "tests" / "data" / "kbo-team-history.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
print(f"{target}: {len(years)} years, {sum(map(len, years.values()))} team seasons")
