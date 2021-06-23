# Configure here
$dbname = "<replace>"
$data_dir = "<replace>"
$env:PGPASSWORD = "<replace>"

# Deletes all files older than 2 months
$date_to_delete = (Get-Date).AddMonths(-2)
$month_to_delete = $date_to_delete.ToString('MM')
$month_to_delete_single = $month_to_delete -replace '^0'
$path_to_delete = ("{0}\{1}\{2}" -f $data_dir, $date_to_delete.ToString('yyyy'), $month_to_delete_single)

if (Test-Path $path_to_delete) {
    Remove-Item -Recurse $path_to_delete
}

# Changes statuses of orders to ARCHIVED for orders done 2 months ago
$month_to_delete_add_one = (Get-Date).AddMonths(-1).ToString('MM')
$sql = @"
UPDATE geoshop.order SET status = 'ARCHIVED'
  WHERE date_processed BETWEEN '2021-$month_to_delete-01' AND '2021-$month_to_delete_add_one-01';
"@

psql -U geoshop -h localhost -d geoshop2 -c $sql
