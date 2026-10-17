import Foundation

struct AppConfiguration {
    let supabaseURL: URL
    let publishableKey: String

    static func load(bundle: Bundle = .main) throws -> AppConfiguration {
        guard let rawURL = bundle.object(forInfoDictionaryKey: "PTPROSupabaseURL") as? String,
              let url = URL(string: rawURL), !rawURL.isEmpty,
              let key = bundle.object(forInfoDictionaryKey: "PTPROPublishableKey") as? String,
              !key.isEmpty else { throw ConfigurationError.missingSupabaseConfiguration }
        return AppConfiguration(supabaseURL: url, publishableKey: key)
    }
}

enum ConfigurationError: LocalizedError {
    case missingSupabaseConfiguration
    var errorDescription: String? { "Configurazione Cloud PT-PRO mancante." }
}
