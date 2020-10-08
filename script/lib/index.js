const glob = require('glob');
const fs = require('fs');
const path = require('path');
const markdownIt = require('markdown-it');

const markdown = markdownIt({
    html: true,
    linkify: true,
    typographer: true
});

const configReg = /^===([\s\S]*)===$/mi;
const includeReg = /<%=\s{0,}include\(\s{0,}['"‘’]?([0-9a-zA-Z\.\/\-\_@]*)['"‘’]?\s{0,}\);?\s{0,}%>/gi;

const setOrderList = (fileList = [], mdConfigMap = {}) => {
    let result = [],
        unOrderList = [],
        orderList = [];

    fileList.map((item) => {
        const order = mdConfigMap[item] && mdConfigMap[item].order;
        if (typeof order !== 'undefined') {
            if (!orderList[order]) {
                orderList[order] = [];
            }
            orderList[order].push(item);
        } else {
            unOrderList.push(item);
        }

        return item;
    });

    orderList.map((item) => {
        if (item) {
            result = result.concat(item);
        }

        return item;
    });

    result = result.concat(unOrderList);

    return result;
};

const getSideBar = (files = [], curItem = '', mdConfigMap = {}) => {
    let result = [],
        filesList = [],
        unConfigFilesList = [],
        unCategoryFilesList = [],
        classTypeMap = {},
        categoryMap = {},
        categoryList = [],
        categoryIndex = 0,
        categoryCount = 0,
        sortCategoryList = [],
        unSortCategoryList = [],
        haveCategoryFilesList = [],
        orderList = [],
        key = '';

    files.map((item) => {
        if (mdConfigMap[item]) {
            const category= mdConfigMap[item].category || '';
            const categoryOrder = typeof mdConfigMap[item].categoryOrder !== 'undefined' ? mdConfigMap[item].categoryOrder : '';
            const categoryClassName = mdConfigMap[item].categoryClassName || '';
            const categoryId = mdConfigMap[item].categoryId || '';
            const classType = mdConfigMap[item].classType || '';
            const classTypeClassName = mdConfigMap[item].classTypeClassName || '';

            if (!category) {
                unCategoryFilesList.push(item);
            } else {
                if (!categoryMap[category]) {
                    categoryMap[category] = {
                        category: category,
                        classType: classType,
                        classTypeClassName: classTypeClassName,
                        list: []
                    };
                }
                if (categoryClassName) {
                    categoryMap[category].categoryClassName = categoryClassName;
                }
                if (categoryId) {
                    categoryMap[category].categoryId = categoryId;
                }
                if (categoryOrder.toString().length > 0) {
                    categoryMap[category].categoryOrder = categoryOrder;
                }
                categoryMap[category].list.push(item);

                if (classType) {
                    classTypeMap[classType] = true;
                }
            }
        } else {
            unConfigFilesList.push(item);
        }
        return item;
    });

    // 排序
    for (key in categoryMap) {
        if (categoryMap[key].categoryOrder && categoryMap[key].categoryOrder.toString().length > 0) {
            sortCategoryList[categoryMap[key].categoryOrder] = categoryMap[key];
        } else {
            unSortCategoryList.push(categoryMap[key]);
        }
    }

    categoryList = sortCategoryList.concat(unSortCategoryList);
    categoryIndex = 0;
    categoryCount = categoryList.length;

    for (; categoryIndex < categoryCount; categoryIndex++) {
        if (categoryList[categoryIndex]) {
            key = categoryList[categoryIndex].category;
            categoryMap[key].list = setOrderList(categoryMap[key].list, mdConfigMap);
            haveCategoryFilesList.push(categoryMap[key]);
        }
    }

    filesList = setOrderList(unConfigFilesList, mdConfigMap).concat(setOrderList(unCategoryFilesList, mdConfigMap)).concat(haveCategoryFilesList);

    result.push('<ul>');

    filesList.map((item) => {
        const getLiItem = (theItem) => {
            const basename = path.basename(theItem);
            const mdConfig = mdConfigMap[theItem] || {};
            let className = '',
                relativeUrl = '',
                url = '',
                liResult = [];

            if (theItem === curItem) {
                className = 'class="active"';
            }
            relativeUrl = path.relative(curItem, theItem);

            if (relativeUrl) {
                url = relativeUrl.replace(/\\/gi, '/').replace('../', '').replace('.md', '.html');
            } else {
                url = 'javascript:;';
            }

            liResult.push('<li ' + className + '>');
            liResult.push('<a href=' + url + ' class="category-list-title" title="' + (mdConfig.title || basename) + '">' + (mdConfig.title || basename) + '</a>');

            if (mdConfig.list && mdConfig.list.length > 0) {
                liResult.push('<ul class="category-list-anchor">');
                mdConfig.list.map((subItem) => {
                    if (subItem) {
                        liResult.push('<li>');
                        liResult.push('<a href=' + subItem.href + '>' + subItem.label + '</a>');
                        liResult.push('</li>');
                    }
                    return item;
                });
                liResult.push('</ul>');
            }

            liResult.push('</li>');

            return liResult;
        };

        if (item) {
            if (typeof item === 'string') {
                result = result.concat(getLiItem(item));
            } else if (typeof item === 'object' && item.category && item.list && item.list.length > 0) {
                result.push('<li>');
                if (item.classType && classTypeMap[item.classType]) {
                    result.push('<h3 class="classType ' + (item.classTypeClassName || '') + '">' + item.classType + '</h3>');
                    classTypeMap[item.classType] = false;
                }
                result.push('<h3 id="' + (item.categoryId || '') + '" class="category ' + (item.categoryClassName || '') + '">' + item.category + '</h3>');
                result.push('<ul id="' + (item.categoryId ? item.categoryId + '_list' : '') + '" class="category-list  ' + (item.categoryClassName || '') + '">');
                item.list.map((liItem) => {
                    if (liItem) {
                        result = result.concat(getLiItem(liItem));
                    }
                    return liItem;
                });
                result.push('</ul>');
                result.push('</li>');
            }
        }
        return item;
    });

    result.push('</ul>');

    return result.join('\n');
};

const getConfig = (mdContent = '') => {
    let result = {};

    mdContent.replace(configReg, function(content, $1) {
        try {
            result = JSON.parse($1);
        } catch(e) {
            console.log(e.message);
        }

        return '';
    });

    return result;
};

const build = (theFiles = '', theConfig, theCallback) => {
    const files = theFiles || '';
    let config = {},
        callback = function() {},
        mdConfigMap = {},
        script = {};

    if (typeof theCallback === 'undefined') {
        callback = theConfig || function() {};
    } else {
        config = theConfig || {};
        callback = theCallback || function() {};
    }
    script = config.script || {};

    glob(files, (err, files) => {
        if (err) {
            callback(err, '', '');
        } else {
            // 获取导航配置
            files.map((item = '') => {
                if (item) {
                    const mdContent = fs.readFileSync(item, 'utf8');
                    const mdConfig = getConfig(mdContent);

                    mdConfigMap[item] = mdConfig;
                }

                return item;
            });

            // 生成页面内容
            files.map((item = '') => {
                if (item) {
                    try {
                        let htmlContent = '',
                            templateContent = '',
                            templateUrl = '',
                            result = '',
                            sideBarContent = '',
                            mdContent = fs.readFileSync(item, 'utf8'),
                            mdConfig = getConfig(mdContent),
                            scriptList = [],
                            scriptContent = [],
                            key = '';

                        for (key in script) {
                            if (key && item.indexOf(key) > -1) {
                                scriptList = script[key] || [];
                            }
                        }
                        scriptList.map((scriptItem) => {
                            if (scriptItem) {
                                scriptContent.push('<script type="text/javascript" src="'+ scriptItem +'?time=' + (+new Date().getTime()) + '"></script>');
                            }
                            return item;
                        });

                        mdContent = mdContent.replace(includeReg, (content, $1) => {
                            const cwd = process.cwd();
                            const includeFileUrl = path.join(cwd, $1);
                            let result = '';

                            // 如果是.html的就放置在markdown.render之后引入
                            if (includeFileUrl.indexOf('.html') > -1) {
                                return content;
                            }

                            try {
                                result = fs.readFileSync(includeFileUrl, 'utf8');
                            } catch(e) {
                                console.log(e.message);
                            }
                            return result;
                        });
                        htmlContent = markdown.render(mdContent.replace(configReg, ''));

                        htmlContent = htmlContent.replace(/\&lt;\%=/gi, '<%=');
                        htmlContent = htmlContent.replace(/\%\&gt;/gi, '%>');

                        htmlContent = htmlContent.replace(includeReg, (content, $1) => {
                            const cwd = process.cwd();
                            const includeFileUrl = path.join(cwd, $1);
                            let result = '';

                            // 如果是.html的就放置在markdown.render之后引入
                            if (includeFileUrl.indexOf('.html') < 0) {
                                return content;
                            }

                            try {
                                result = fs.readFileSync(includeFileUrl, 'utf8');
                            } catch(e) {
                                console.log(e.message);
                            }
                            return result;
                        });

                        if (typeof config === 'object' && config.template) {
                            if (typeof config.template === 'boolean') {
                                if (config.navigation) {
                                    templateUrl = path.join(__dirname, './template/navigation.html');
                                } else {
                                    templateUrl = path.join(__dirname, './template/index.html');
                                }
                            } else {
                                templateUrl = config.template;
                            }

                            sideBarContent = getSideBar(files, item, mdConfigMap);

                            try {
                                templateContent = fs.readFileSync(templateUrl, 'utf8');
                            } catch(e) {}

                            if (templateContent) {
                                result = templateContent.replace('<%= title %>', (mdConfig.title || path.basename(item)));
                                result = result.replace('<%= sidebar %>', sideBarContent);
                                result = result.replace('<%= content %>', htmlContent);
                                result = result.replace('<%= script %>', scriptContent.join('\n'));
                            } else {
                                result = htmlContent;
                            }
                        } else {
                            result = htmlContent;
                        }

                        callback(false, item, result);
                    } catch(e) {
                        callback(e, '', '');
                    }
                }

                return item;
            });
        }
    });
};

module.exports = {
    build
};
