<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

/**
 * Example 5: PHP / Laravel HTTP Client integration for Kedata CMS
 */
class KedataCmsService
{
    protected string $baseUrl;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.kedata.url', 'http://localhost:3000/api/v1');
        $this->apiKey = config('services.kedata.key', env('KEDATA_API_KEY'));
    }

    /**
     * Ambil daftar artikel dengan filter kategori opsional
     */
    public function getPosts(int $perPage = 10, ?string $category = null): array
    {
        $query = [
            'perPage' => $perPage,
            'include' => 'category,tags',
        ];

        if ($category) {
            $query['category'] = $category;
        }

        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'Accept'    => 'application/json',
        ])->get("{$this->baseUrl}/posts", $query);

        if ($response->failed()) {
            throw new Exception("Kedata CMS Error: " . $response->status());
        }

        return $response->json('data', []);
    }

    /**
     * Ambil halaman berdasarkan slug
     */
    public function getPage(string $slug): ?array
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'Accept'    => 'application/json',
        ])->get("{$this->baseUrl}/pages/{$slug}");

        if ($response->status() === 404) {
            return null;
        }

        return $response->json('data');
    }
}
