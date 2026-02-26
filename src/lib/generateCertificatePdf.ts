import jsPDF from "jspdf";
import QRCode from "qrcode";

interface CertificateData {
  recipientName: string;
  courseTitle: string;
  issueDate: string;
  certificateId: string;
  type?: "course" | "competition";
}

export const generateCertificatePdf = async ({
  recipientName,
  courseTitle,
  issueDate,
  certificateId,
  type = "course",
}: CertificateData) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  // --- Background ---
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, W, H, "F");

  // --- Outer border ---
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, W - 20, H - 20);

  // --- Inner border ---
  doc.setDrawColor(200, 160, 60, 0.4);
  doc.setLineWidth(0.3);
  doc.rect(14, 14, W - 28, H - 28);

  // --- Corner accents ---
  const cornerLen = 18;
  const corners = [
    { x: 10, y: 10, dx: 1, dy: 1 },
    { x: W - 10, y: 10, dx: -1, dy: 1 },
    { x: 10, y: H - 10, dx: 1, dy: -1 },
    { x: W - 10, y: H - 10, dx: -1, dy: -1 },
  ];
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(1.2);
  corners.forEach(({ x, y, dx, dy }) => {
    doc.line(x, y, x + cornerLen * dx, y);
    doc.line(x, y, x, y + cornerLen * dy);
  });

  // --- Top accent line ---
  const accentY = 42;
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 60, accentY, W / 2 + 60, accentY);

  // --- Small diamond at center of accent ---
  const cx = W / 2;
  doc.setFillColor(200, 160, 60);
  doc.triangle(cx, accentY - 3, cx - 3, accentY, cx, accentY + 3, "F");
  doc.triangle(cx, accentY - 3, cx + 3, accentY, cx, accentY + 3, "F");

  // --- "CERTIFICATE OF ..." ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 160, 60);
  const labelText = type === "competition" ? "CERTIFICATE OF ACHIEVEMENT" : "CERTIFICATE OF COMPLETION";
  const spacedLabel = labelText.split("").join("  ");
  doc.text(spacedLabel, W / 2, 36, { align: "center" });

  // --- "50mm Retina" ---
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("50MM RETINA", W / 2, 50, { align: "center" });

  // --- "This is to certify that" ---
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text("This is to certify that", W / 2, 68, { align: "center" });

  // --- Recipient name ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text(recipientName, W / 2, 86, { align: "center" });

  // --- Line under name ---
  const nameWidth = Math.min(doc.getTextWidth(recipientName) + 20, 180);
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - nameWidth / 2, 90, W / 2 + nameWidth / 2, 90);

  // --- "has successfully completed" / "has been awarded winner in" ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  const subtitle = type === "competition"
    ? "has been awarded winner in"
    : "has successfully completed all lessons in";
  doc.text(subtitle, W / 2, 102, { align: "center" });

  // --- Course title ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(18);
  doc.setTextColor(200, 160, 60);
  // Wrap long titles
  const maxTitleWidth = 220;
  const titleLines = doc.splitTextToSize(courseTitle, maxTitleWidth);
  const titleStartY = 116;
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, W / 2, titleStartY + i * 9, { align: "center" });
  });

  const afterTitleY = titleStartY + titleLines.length * 9 + 8;

  // --- Decorative line ---
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 40, afterTitleY, W / 2 + 40, afterTitleY);

  // --- Date ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`Issued on ${issueDate}`, W / 2, afterTitleY + 12, { align: "center" });

  // --- Certificate ID (full UUID for verification) ---
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Certificate ID: ${certificateId}`, W / 2, H - 20, { align: "center" });

  // --- Verification URL ---
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const publishedOrigin = "https://lens-lustre-learn.lovable.app";
  const origin = window.location.hostname === "localhost" || window.location.hostname.includes("preview")
    ? publishedOrigin
    : window.location.origin;
  const verifyUrl = `${origin}/verify?id=${certificateId}`;
  doc.text(`Verify at: ${verifyUrl}`, W / 2, H - 16, { align: "center" });

  // --- Bottom accent ---
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 30, H - 26, W / 2 + 30, H - 26);

  // --- QR Code ---
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#c8a03c", light: "#0f0f0f" },
    });
    const qrSize = 22;
    doc.addImage(qrDataUrl, "PNG", W - 42, H - 44, qrSize, qrSize);
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan to verify", W - 42 + qrSize / 2, H - 20, { align: "center" });
  } catch { /* QR generation failed silently */ }

  return doc;
};
