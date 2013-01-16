const int numberOfPins = 6;

void setup() {
  Serial.begin(9600);
}

void loop() {
  Serial.print("[");
  for (int pin = 0; pin < numberOfPins; pin++) {
    Serial.print(analogRead(pin));
    if (pin != numberOfPins - 1) {
      Serial.print(",");
    }
  }
  Serial.print("]");
  delay(100);
}

