<?php
require 'db.php';

$result = $conn->query("SELECT * FROM inventory");
$inventory = [];
while ($row = $result->fetch_assoc()) {
    $inventory[] = $row;
}
echo json_encode($inventory);
$conn->close();
?>