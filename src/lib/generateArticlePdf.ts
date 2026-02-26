import jsPDF from "jspdf";

interface ArticleData {
  title: string;
  excerpt?: string | null;
  body: string;
  cover_image_url?: string | null;
  tags: string[];
  published_at?: string | null;
  created_at: string;
  author_name?: string | null;
}

const BRAND_NAME = "50mm Retina";
const LOGO_PATH = "/images/logo.png";

// A4 dimensions in mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const COL_GAP = 8;
const COL_W = (CONTENT_W - COL_GAP) / 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateArticlePdf(article: ArticleData): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ===== COVER PAGE =====
  // Background
  pdf.setFillColor(15, 15, 15);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Try to load logo
  try {
    const logoImg = await loadImage(LOGO_PATH);
    pdf.addImage(logoImg, "PNG", PAGE_W / 2 - 15, 40, 30, 30);
  } catch {
    // fallback: just text
  }

  // Brand name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.text(BRAND_NAME, PAGE_W / 2, 85, { align: "center" });

  // Decorative line
  pdf.setDrawColor(180, 160, 120);
  pdf.setLineWidth(0.3);
  pdf.line(PAGE_W / 2 - 30, 95, PAGE_W / 2 + 30, 95);

  // Article title
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  const titleLines = pdf.splitTextToSize(article.title, CONTENT_W - 20);
  pdf.text(titleLines, PAGE_W / 2, 120, { align: "center" });

  // Author & date
  const dateStr = new Date(article.published_at || article.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(180, 180, 180);
  const authorLine = article.author_name ? `By ${article.author_name}` : "";
  if (authorLine) pdf.text(authorLine, PAGE_W / 2, 145, { align: "center" });
  pdf.text(dateStr, PAGE_W / 2, 153, { align: "center" });

  // Tags
  if (article.tags.length > 0) {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(article.tags.join("  ·  ").toUpperCase(), PAGE_W / 2, 165, { align: "center" });
  }

  // Cover image on cover page
  if (article.cover_image_url) {
    try {
      const coverImg = await loadImage(article.cover_image_url);
      const imgW = CONTENT_W - 20;
      const ratio = coverImg.height / coverImg.width;
      const imgH = Math.min(imgW * ratio, 90);
      pdf.addImage(coverImg, "JPEG", MARGIN + 10, 180, imgW, imgH);
    } catch {
      // skip cover image
    }
  }

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`© ${new Date().getFullYear()} ${BRAND_NAME}`, PAGE_W / 2, PAGE_H - 15, { align: "center" });

  // ===== CONTENT PAGES (Magazine two-column layout) =====
  // Parse body into blocks (text paragraphs and inline images)
  const blocks = parseBodyBlocks(article.body);

  let curPage = 1;
  let colIdx = 0; // 0 = left, 1 = right
  let yPos = MARGIN + 10;

  const addNewPage = () => {
    pdf.addPage();
    curPage++;
    colIdx = 0;
    yPos = MARGIN + 10;

    // Page header
    pdf.setFillColor(250, 250, 248);
    pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN);

    // Header text
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "italic");
    pdf.text(BRAND_NAME, MARGIN, MARGIN - 3);
    pdf.text(`Page ${curPage}`, PAGE_W - MARGIN, MARGIN - 3, { align: "right" });

    // Footer
    pdf.setFontSize(6);
    pdf.text(article.title.substring(0, 60), PAGE_W / 2, PAGE_H - 10, { align: "center" });
  };

  const getColX = () => colIdx === 0 ? MARGIN : MARGIN + COL_W + COL_GAP;

  const nextColumn = () => {
    if (colIdx === 0) {
      colIdx = 1;
      yPos = MARGIN + 10;
    } else {
      addNewPage();
    }
  };

  // Start first content page
  addNewPage();

  // Excerpt at top if present
  if (article.excerpt) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(80, 80, 80);
    const excerptLines = pdf.splitTextToSize(article.excerpt, CONTENT_W);
    pdf.text(excerptLines, MARGIN, yPos);
    yPos += excerptLines.length * 5 + 8;

    // Separator line
    pdf.setDrawColor(180, 160, 120);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
    yPos += 10;
  }

  // Render blocks in two columns
  for (const block of blocks) {
    if (block.type === "text") {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(40, 40, 40);
      const lines = pdf.splitTextToSize(block.content, COL_W);
      const blockHeight = lines.length * 4;

      if (yPos + blockHeight > PAGE_H - MARGIN - 15) {
        nextColumn();
      }

      pdf.text(lines, getColX(), yPos);
      yPos += blockHeight + 4;
    } else if (block.type === "image") {
      try {
        const img = await loadImage(block.content);
        const imgW = COL_W;
        const ratio = img.height / img.width;
        const imgH = Math.min(imgW * ratio, 80);

        if (yPos + imgH > PAGE_H - MARGIN - 15) {
          nextColumn();
        }

        pdf.addImage(img, "JPEG", getColX(), yPos, imgW, imgH);
        yPos += imgH + 6;
      } catch {
        // skip failed image
      }
    }
  }

  pdf.save(`${article.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`);
}

interface BodyBlock {
  type: "text" | "image";
  content: string;
}

function parseBodyBlocks(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  // Split by double newlines, then check for [img:URL] pattern
  const parts = body.split("\n\n");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const imgMatch = trimmed.match(/^\[img:(.*?)\]$/);
    if (imgMatch) {
      blocks.push({ type: "image", content: imgMatch[1] });
    } else {
      blocks.push({ type: "text", content: trimmed });
    }
  }
  return blocks;
}
