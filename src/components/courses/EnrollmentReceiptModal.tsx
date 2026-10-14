import React from "react";
import PaymentReceipt, { PaymentReceiptProps } from "./PaymentReceipt";

export interface EnrollmentReceiptModalProps extends PaymentReceiptProps {
  onClose: () => void;
  onGoToDashboard: () => void;
}

export default function EnrollmentReceiptModal(props: EnrollmentReceiptModalProps) {
  return <PaymentReceipt {...props} isModal={true} />;
}
