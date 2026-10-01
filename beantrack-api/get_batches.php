<?php
require 'db.php';

$result = $conn->query("SELECT * FROM batches ORDER BY id DESC");
$batches = [];
while ($row = $result->fetch_assoc()) {
    $batches[] = $row;
}
echo json_encode($batches);
$conn->close();
?>