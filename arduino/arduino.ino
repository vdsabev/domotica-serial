const int PINS = 6;
int states[PINS],
    values[PINS];
String buffer;

void setup() {
  Serial.begin(9600); // Initialize
  while (!Serial); // Wait
  while (Serial.available()) Serial.read(); // Flush
}

void loop() {
  if (Serial.available()) { // Read messages
    while (Serial.available()) {
      buffer += char(Serial.read());
    }

    int startIndex = buffer.lastIndexOf('['),
          endIndex = buffer.lastIndexOf(']');
    if (0 <= startIndex && startIndex < endIndex) { // Parse last message into values
      int pin = 0,
          valueStartIndex = 0,
          valueEndIndex = 0;
      String message = buffer.substring(startIndex + 1, endIndex + 1);
      while (valueEndIndex < message.length()) { // Parse values into the pins array
        if (message[valueEndIndex] == ',' || message[valueEndIndex] == ']') {
          String value = message.substring(valueStartIndex, valueEndIndex);
          value.trim();
          int previousState = states[pin];
          if (value == "null") {
            states[pin] = INPUT;
            values[pin] = 0;
          }
          else {
            states[pin] = OUTPUT;

            char valueBuffer[32];
            value.toCharArray(valueBuffer, sizeof(valueBuffer));
            values[pin] = atof(valueBuffer);
          }
          if (previousState != states[pin]) { // Change pin mode
            pinMode(pin, states[pin]);
          }

          pin++;
          valueStartIndex = valueEndIndex + 1;
        }
        valueEndIndex++;
      }

      buffer = buffer.substring(endIndex + 1); // Remove parsed messages
    }
  }

  // Print input values and set output values
  String message;
  for (int pin = 0; pin < PINS; pin++) {
    if (states[pin] == INPUT) {
      message += String(analogRead(pin));
    }
    else if (states[pin] == OUTPUT) {
      analogWrite(pin, values[pin]);
      message += "null";
    }
    if (pin != PINS - 1) {
      message += ',';
    }
  }
  if (message.length()) {
    Serial.print('[');
    Serial.print(message);
    Serial.print(']');
  }

  delay(1000);
}
