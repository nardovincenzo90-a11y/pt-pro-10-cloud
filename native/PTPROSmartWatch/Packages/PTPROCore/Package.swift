// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PTPROCore",
    platforms: [.iOS(.v17), .watchOS(.v10)],
    products: [.library(name: "PTPROCore", targets: ["PTPROCore"])],
    targets: [
        .target(name: "PTPROCore"),
        .testTarget(name: "PTPROCoreTests", dependencies: ["PTPROCore"])
    ]
)
