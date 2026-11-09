import AppKit
let logo = NSImage(contentsOfFile: CommandLine.arguments[1])!
let out = CommandLine.arguments[2]
let W = 1200, H = 630
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let bg = NSColor(srgbRed: 0xFA/255, green: 0xFA/255, blue: 0xFA/255, alpha: 1)
bg.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
// Faint grid, like the site hero
let grid = NSColor(srgbRed: 0xE4/255, green: 0xE4/255, blue: 0xE7/255, alpha: 0.55)
grid.setStroke()
let path = NSBezierPath(); path.lineWidth = 1
var x = 0.0; while x <= Double(W) { path.move(to: NSPoint(x: x + 0.5, y: 0)); path.line(to: NSPoint(x: x + 0.5, y: Double(H))); x += 56 }
var y = 0.0; while y <= Double(H) { path.move(to: NSPoint(x: 0, y: y + 0.5)); path.line(to: NSPoint(x: Double(W), y: y + 0.5)); y += 56 }
path.stroke()
// Logo on the left, with a soft shadow
let shadow = NSShadow(); shadow.shadowColor = NSColor(white: 0, alpha: 0.12); shadow.shadowBlurRadius = 30; shadow.shadowOffset = NSSize(width: 0, height: -10)
NSGraphicsContext.saveGraphicsState(); shadow.set()
logo.draw(in: NSRect(x: 96, y: 135, width: 360, height: 360))
NSGraphicsContext.restoreGraphicsState()
func text(_ s: String, size: CGFloat, weight: NSFont.Weight, color: NSColor, at p: NSPoint) {
  let font = NSFont(name: weight == .bold ? "PingFangSC-Semibold" : "PingFangSC-Regular", size: size) ?? NSFont.systemFont(ofSize: size, weight: weight)
  NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color, .kern: weight == .bold ? -1.2 : 0]).draw(at: p)
}
let ink = NSColor(srgbRed: 0x18/255, green: 0x18/255, blue: 0x1B/255, alpha: 1)
let gray = NSColor(srgbRed: 0x52/255, green: 0x52/255, blue: 0x5B/255, alpha: 1)
let blue = NSColor(srgbRed: 0x25/255, green: 0x63/255, blue: 0xEB/255, alpha: 1)
text("UIUC · Spring 2027", size: 26, weight: .regular, color: blue, at: NSPoint(x: 520, y: 400))
text("慵懒选课，", size: 76, weight: .bold, color: ink, at: NSPoint(x: 516, y: 290))
text("依旧耍起", size: 76, weight: .bold, color: ink, at: NSPoint(x: 516, y: 190))
text("GenEd 水课指北 · 按 2027 春老师的历史给分排序", size: 26, weight: .regular, color: gray, at: NSPoint(x: 520, y: 130))
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
