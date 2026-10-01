<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$batch_code = $conn->real_escape_string($data['batch_code']);
$bean_type = $conn->real_escape_string($data['bean_type']);
$mode = $conn->real_escape_string($data['mode']);
$vibration_speed = intval($data['vibration_speed']);
$input_weight = intval($data['input_weight']);
$large = intval($data['large_weight']);
$medium = intval($data['medium_weight']);
$small = intval($data['small_weight']);
$fine = intval($data['fine_weight']);
$processing_time = intval($data['processing_time']);

$sql = "INSERT INTO batches (batch_code, bean_type, mode, vibration_speed, input_weight, large_weight, medium_weight, small_weight, fine_weight, processing_time)
VALUES ('$batch_code', '$bean_type', '$mode', $vibration_speed, $input_weight, $large, $medium, $small, $fine, $processing_time)";

if ($conn->query($sql)) {
    $categories = ['large' => $large, 'medium' => $medium, 'small' => $small, 'fine' => $fine];
    foreach ($categories as $cat => $grams) {
        $kg = $grams / 1000;
        $conn->query("UPDATE inventory SET quantity_kg = quantity_kg + $kg WHERE bean_type = '$bean_type' AND category = '$cat'");
    }
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => $conn->error]);
}

$conn->close();
?>