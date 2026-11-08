import AppKit
import CoreGraphics

let src = CommandLine.arguments[1], outDir = CommandLine.arguments[2]
let img = NSImage(contentsOfFile: src)!
var rect = CGRect(origin: .zero, size: img.size)
let cg = img.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
let w = cg.width, h = cg.height
// Read pixels
let cs = CGColorSpaceCreateDeviceRGB()
var buf = [UInt8](repeating: 0, count: w * h * 4)
let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
// Bounding box of clearly non-white pixels = the badge
var minX = w, minY = h, maxX = 0, maxY = 0
for y in 0..<h { for x in 0..<w {
  let i = (y * w + x) * 4
  let r = Int(buf[i]), g = Int(buf[i+1]), b = Int(buf[i+2])
  if min(r, g, b) < 200 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
}}
let cx = Double(minX + maxX) / 2, cy = Double(h) - Double(minY + maxY) / 2  // buffer rows are top-down; CG draws bottom-up
let radius = Double(max(maxX - minX, maxY - minY)) / 2 + 2
print("bbox", minX, minY, maxX, maxY, "center", cx, cy, "r", radius)

func render(_ size: Int, _ name: String, background: NSColor? = nil, padding: Double = 0) {
  let c = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  c.interpolationQuality = .high
  if let bg = background { c.setFillColor(bg.cgColor); c.fill(CGRect(x: 0, y: 0, width: size, height: size)) }
  let inner = Double(size) * (1 - 2 * padding)
  let off = Double(size) * padding
  let circle = CGRect(x: off, y: off, width: inner, height: inner)
  c.addEllipse(in: circle); c.clip()
  c.setFillColor(NSColor.white.cgColor); c.fill(circle)
  let scale = inner / (2 * radius)
  // CG origin is bottom-left; buffer rows were drawn so that y=0 is bottom too.
  let drawRect = CGRect(x: off - (cx - radius) * scale, y: off - (cy - radius) * scale, width: Double(w) * scale, height: Double(h) * scale)
  c.draw(cg, in: drawRect)
  let out = c.makeImage()!
  let rep = NSBitmapImageRep(cgImage: out)
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: outDir + "/" + name))
}
render(512, "logo-512.png")
render(192, "logo-192.png")
render(64, "logo-64.png")
render(32, "favicon-32.png")
// iOS home screen icons are square with no transparency: white tile, badge slightly inset
render(180, "apple-touch-icon.png", background: .white, padding: 0.06)
