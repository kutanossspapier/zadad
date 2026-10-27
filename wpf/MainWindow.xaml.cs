using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace ElektroBudDesktop;

public partial class MainWindow : Window
{
    //"adres strony"
    private const string Host = "elektrobud.local";

    public MainWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) => await UruchomAsync();
    }

    //uruchomienie przeglądarki i wczytanie strony
    private async Task UruchomAsync()
    {
        try
        {
            //folder na dane przeglądarki (localStorage z bazą)
            string folderDanych = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ElektroBud");
            var srodowisko = await CoreWebView2Environment.CreateAsync(userDataFolder: folderDanych);

            await Przegladarka.EnsureCoreWebView2Async(srodowisko);

            string folderWeb = Path.Combine(AppContext.BaseDirectory, "web");
            Przegladarka.CoreWebView2.SetVirtualHostNameToFolderMapping(
                Host, folderWeb, CoreWebView2HostResourceAccessKind.Allow);

            Przegladarka.CoreWebView2.DocumentTitleChanged += (_, _) => Title = Przegladarka.CoreWebView2.DocumentTitle;

            //wczytanie aplikacji
            Przegladarka.Source = new Uri($"https://{Host}/index.html");
        }
        catch (WebView2RuntimeNotFoundException)
        {
            //brak WebView2 (u mnie działa)
            MessageBox.Show("Brak środowiska Microsoft Edge WebView2 Runtime.\n" +
                            "Pobierz je ze strony: https://developer.microsoft.com/microsoft-edge/webview2/",
                "Elektro-Bud", MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }
}
