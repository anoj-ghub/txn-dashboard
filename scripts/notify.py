"""Optional post-deployment SMTP notification. Uses only Python's standard library."""
import csv
import json
import os
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path


def create_message(rows, metadata, page_url):
    year, month = max((int(row['Year']), int(row['Month'])) for row in rows)
    current = [row for row in rows if int(row['Year']) == year and int(row['Month']) <= month]
    prior = [row for row in rows if int(row['Year']) == year - 1 and int(row['Month']) <= month]
    latest = [row for row in rows if int(row['Year']) == year and int(row['Month']) == month]
    total = sum(int(row['Txn-count']) for row in current)
    previous = sum(int(row['Txn-count']) for row in prior)
    change = f'{(total / previous - 1) * 100:+.1f}%' if previous else 'unavailable'
    label = 'SYNTHETIC DEMO' if metadata['kind'] == 'synthetic' else 'Monthly reporting'
    lines = [f'Atlas Market Intelligence — {year}-{month:02d}', label, '',
             f'Coverage: 14 markets, data through {year}-{month:02d}.',
             f'Year-to-date transactions: {total:,} (YoY: {change}; matched months).']
    for field in ['Total Active Plastic', 'Total Active Basic', 'Active Accounts']:
        lines.append(f'{field} (latest month): {sum(int(row[field]) for row in latest):,}')
    lines.extend(['', f'Open dashboard: {page_url}', '', 'Transactions are summed over the selected months. Cards and accounts are end-of-period snapshots.'])
    return f'Atlas dashboard updated | {year}-{month:02d}', '\n'.join(lines)


if __name__ == '__main__':
    required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM', 'EMAIL_TO', 'PAGE_URL']
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        raise SystemExit('Missing notification configuration: ' + ', '.join(missing))
    with Path('public/data/markets.csv').open(encoding='utf-8-sig', newline='') as source:
        rows = list(csv.DictReader(source))
    metadata = json.loads(Path('public/data/metadata.json').read_text(encoding='utf-8'))
    subject, body = create_message(rows, metadata, os.environ['PAGE_URL'])
    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = os.environ['EMAIL_FROM']
    # Bcc-style envelope recipients: recipient addresses are not disclosed to one another.
    message['To'] = os.environ['EMAIL_FROM']
    recipients = [address.strip() for address in os.environ['EMAIL_TO'].split(',') if address.strip()]
    if not recipients:
        raise SystemExit('EMAIL_TO must contain at least one recipient.')
    message.set_content(body)
    port = int(os.environ.get('SMTP_PORT') or '587')
    context = ssl.create_default_context()
    if port == 465:
        connection = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], port, context=context, timeout=30)
    else:
        connection = smtplib.SMTP(os.environ['SMTP_HOST'], port, timeout=30)
        connection.starttls(context=context)
    with connection:
        connection.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
        connection.send_message(message, to_addrs=recipients)
    print('Dashboard update notification sent.')
