import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  views: number;
  helpful_votes: number;
  unhelpful_votes: number;
}

interface HelpSearchDialogProps {
  children: React.ReactNode;
}

export function HelpSearchDialog({ children }: HelpSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchArticles();
    }
  }, [open]);

  useEffect(() => {
    filterArticles();
  }, [searchTerm, selectedCategory, articles]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('helpful_votes', { ascending: false });

      if (error) throw error;

      setArticles(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(article => article.category) || [])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load help articles');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (selectedCategory) {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(term) ||
        article.content.toLowerCase().includes(term) ||
        article.keywords.some(keyword => keyword.toLowerCase().includes(term))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleArticleView = async (article: HelpArticle) => {
    setSelectedArticle(article);
    
    // Increment view count
    try {
      await supabase
        .from('help_articles')
        .update({ views: article.views + 1 })
        .eq('id', article.id);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleVote = async (articleId: string, isHelpful: boolean) => {
    try {
      const field = isHelpful ? 'helpful_votes' : 'unhelpful_votes';
      const article = articles.find(a => a.id === articleId);
      if (!article) return;

      const currentValue = isHelpful ? article.helpful_votes : article.unhelpful_votes;
      
      await supabase
        .from('help_articles')
        .update({ [field]: currentValue + 1 })
        .eq('id', articleId);

      toast.success('Thank you for your feedback!');
      fetchArticles(); // Refresh articles
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote');
    }
  };

  if (selectedArticle) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedArticle.title}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                {selectedArticle.views} views
              </div>
            </DialogTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{selectedArticle.category}</Badge>
              {selectedArticle.subcategory && (
                <Badge variant="outline">{selectedArticle.subcategory}</Badge>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: selectedArticle.content.replace(/\n/g, '<br />') }} />
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">Was this article helpful?</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(selectedArticle.id, true)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Yes ({selectedArticle.helpful_votes})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(selectedArticle.id, false)}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" />
                  No ({selectedArticle.unhelpful_votes})
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedArticle(null)}>
                Back to Search
              </Button>
              <Button onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Help Articles
          </DialogTitle>
          <DialogDescription>
            Find answers to common questions and issues
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for help articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setSelectedCategory("")}>
              All Categories
            </Button>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category === selectedCategory ? "" : category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Search results */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading articles...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No articles found matching your search.</p>
                <p className="text-sm">Try different keywords or browse all categories.</p>
              </div>
            ) : (
              filteredArticles.map(article => (
                <Card 
                  key={article.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleArticleView(article)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        {article.views}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                      {article.subcategory && (
                        <Badge variant="outline" className="text-xs">{article.subcategory}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {article.helpful_votes}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" />
                        {article.unhelpful_votes}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}