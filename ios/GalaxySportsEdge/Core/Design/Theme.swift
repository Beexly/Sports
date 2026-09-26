import SwiftUI

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB,
                  red:   Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8)  & 0xFF) / 255,
                  blue:  Double( hex        & 0xFF) / 255,
                  opacity: alpha)
    }
}

enum Theme {
    // Surfaces
    static let bg          = Color(hex: 0x0A0A12)
    static let bgElevated  = Color(hex: 0x12121C)
    static let surface     = Color(hex: 0x16161F)
    static let surfaceHi   = Color(hex: 0x1E1E2B)
    static let stroke      = Color.white.opacity(0.07)
    static let strokeHi    = Color.white.opacity(0.14)

    // Text
    static let text        = Color.white
    static let text2       = Color(hex: 0x9A9AB0)
    static let text3       = Color(hex: 0x5E5E75)

    // Accents
    static let violet      = Color(hex: 0x7C5CFF)
    static let indigo      = Color(hex: 0x4B3BFF)
    static let cyan        = Color(hex: 0x2CE5D2)
    static let win         = Color(hex: 0x2BE07F)
    static let loss        = Color(hex: 0xFF4D6A)
    static let push        = Color(hex: 0xFFB020)

    static let nebula = LinearGradient(
        colors: [violet, cyan],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    static let aurora = LinearGradient(
        colors: [Color(hex: 0x1B1140), bg],
        startPoint: .top, endPoint: .bottom)

    enum R {
        static let sm: CGFloat = 10, md: CGFloat = 16
        static let lg: CGFloat = 22, xl: CGFloat = 28
    }
    enum S {
        static let xs: CGFloat = 4,  sm: CGFloat = 8
        static let md: CGFloat = 12, lg: CGFloat = 16
        static let xl: CGFloat = 24, xxl: CGFloat = 32
    }
}

extension Font {
    static func display(_ size: CGFloat, _ w: Font.Weight = .bold) -> Font {
        .system(size: size, weight: w, design: .rounded)
    }
    static func num(_ size: CGFloat, _ w: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: w, design: .rounded).monospacedDigit()
    }
}
