#include <iostream>
#include <vector>
#include <string>
#include <curl/curl.h>

using namespace std;

const string SERVER_URL = "https://blackwhite12.pythonanywhere.com";

size_t write_callback(void* contents, size_t size, size_t nmemb, string* output) {
    output->append((char*)contents, size * nmemb);
    return size * nmemb;
}

struct ParsedPacket {
    uint8_t sensor1 = 0;
    uint8_t sensor2 = 0;
    uint8_t sensor3 = 0;
    uint8_t sensor4 = 0;
    bool onoff = false;
    int led = 0;
};

void post_binary(const string& api_key, uint8_t sensor1, uint8_t sensor2, uint8_t sensor3, uint8_t sensor4) {
    CURL* curl = curl_easy_init();
    if (!curl) return;

    uint8_t sensor_data[4] = { sensor1, sensor2, sensor3, sensor4 };
    vector<uint8_t> post_data;

    post_data.insert(post_data.end(), api_key.begin(), api_key.end());
    post_data.push_back(0x01);
    post_data.push_back(4);
    post_data.insert(post_data.end(), sensor_data, sensor_data + 4);

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/octet-stream");

    curl_easy_setopt(curl, CURLOPT_URL, (SERVER_URL + "/post_binary").c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_data.data());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, post_data.size());


    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK)
        cerr << "POST failed: " << curl_easy_strerror(res) << endl;
    else
        cout << "POST sent successfully.\n";

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}

void onoff_bin(const string& api_key, bool onoff, int led) {
    CURL* curl;
    CURLcode res;
    struct curl_slist* headers = nullptr;

    curl = curl_easy_init();
    if (curl) {
        vector<uint8_t> post_data;

        post_data.insert(post_data.end(), api_key.begin(), api_key.end());
        post_data.push_back(0x02);
        post_data.push_back(1);
        post_data.push_back(onoff ? 0x01 : 0x00);

        headers = curl_slist_append(headers, "Content-Type: application/octet-stream");

        curl_easy_setopt(curl, CURLOPT_URL, (SERVER_URL + "/post_binary").c_str());
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_data.data());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, post_data.size());

        res = curl_easy_perform(curl);
        if (res != CURLE_OK)
            cerr << "OnOff POST failed: " << curl_easy_strerror(res) << endl;
        else
            cout << "OnOff POST sent successfully.\n";

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    curl = curl_easy_init();
    if (curl) {
        vector<uint8_t> post_data;
        headers = nullptr;

        if (led < 0) led = 0;
        if (led > 255) led = 255;

        post_data.insert(post_data.end(), api_key.begin(), api_key.end());
        post_data.push_back(0x03);
        post_data.push_back(1);
        post_data.push_back(static_cast<uint8_t>(led));

        headers = curl_slist_append(headers, "Content-Type: application/octet-stream");

        curl_easy_setopt(curl, CURLOPT_URL, (SERVER_URL + "/post_binary").c_str());
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_data.data());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, post_data.size());

        res = curl_easy_perform(curl);
        if (res != CURLE_OK)
            cerr << "LED POST failed: " << curl_easy_strerror(res) << endl;
        else
            cout << "LED POST sent successfully.\n";

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
}

ParsedPacket get_binary(const std::string& api_key) {
    ParsedPacket pkt = {0};  // 모든 값 0으로 초기화
    std::string response;

    // CURL 초기화
    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "❌ CURL 초기화 실패" << std::endl;
        return pkt;
    }

    std::string url = SERVER_URL + "/get_binary/" + api_key;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    // 인증서 경로가 필요한 경우에만 설정
    // curl_easy_setopt(curl, CURLOPT_CAINFO, "cacert.pem");

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        std::cerr << "❌ GET 실패: " << curl_easy_strerror(res) << std::endl;
        return pkt;
    }

    if (response.empty() || response.size() < 10) {
        std::cerr << "❌ 응답이 너무 짧음" << std::endl;
        return pkt;
    }

    size_t i = 0;
    while (i + 10 <= response.size()) {
        std::string key = response.substr(i, 8);
        i += 8;

        if (i + 2 > response.size()) break;
        uint8_t type = static_cast<uint8_t>(response[i++]);
        uint8_t length = static_cast<uint8_t>(response[i++]);

        if (i + length > response.size()) break;

        if (type == 0x01 && length == 4) {
            pkt.sensor1 = static_cast<uint8_t>(response[i++]);
            pkt.sensor2 = static_cast<uint8_t>(response[i++]);
            pkt.sensor3 = static_cast<uint8_t>(response[i++]);
            pkt.sensor4 = static_cast<uint8_t>(response[i++]);
        } else if (type == 0x02 && length == 1) {
            pkt.onoff = static_cast<uint8_t>(response[i++]);
        } else if (type == 0x03 && length == 1) {
            pkt.led = static_cast<uint8_t>(response[i++]);
        } else {
            i += length; // 알 수 없는 타입은 건너뜀
        }
    }

    return pkt;
}



/*int main() {
    string api_key = "";
    post_binary(api_key, 10, 20, 30, 40);
    onoff_bin(api_key, true, 100);

    ParsedPacket pkt = get_binary(api_key);

    cout << "== 파싱된 결과 ==" << endl;
    cout << "센서1: " << (int)pkt.sensor1 << endl;
    cout << "센서2: " << (int)pkt.sensor2 << endl;
    cout << "센서3: " << (int)pkt.sensor3 << endl;
    cout << "센서4: " << (int)pkt.sensor4 << endl;
    cout << "OnOff: " << pkt.onoff << endl;
    cout << "LED: " << (int)pkt.led << endl;

    return 0;
} */
