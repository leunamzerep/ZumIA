// Paso de pago del anticipo. Se carga aparte (React.lazy) SOLO si PAYMENTS_ENABLED es true (ver Quote.tsx):
// con el interruptor apagado este archivo no entra al bundle.
// Tanda 7: todavía sin interfaz (no muestra nada). La tarjeta y el panel llegan en la tanda 8.
const PaymentStep = () => null;

export default PaymentStep;
